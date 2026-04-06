from __future__ import annotations

from threading import Lock
from time import perf_counter

from apscheduler.schedulers.background import BackgroundScheduler

from app.dependencies import get_supabase
from app.services.background_jobs import cleanup_background_jobs, run_retryable_background_jobs
from app.services.frontdesk_service import run_auto_follow_up_tasks, send_due_reminders
from app.utils.logger import get_logger

logger = get_logger(__name__)

_scheduler: BackgroundScheduler | None = None
_scheduler_lock = Lock()


def _load_clinic_ids() -> list[str]:
    result = get_supabase().table("clinics").select("id").execute()
    return [str(row["id"]) for row in (result.data or []) if row.get("id")]


def _log_job_result(job_name: str, started_at: float, **counts: int) -> None:
    duration_ms = int((perf_counter() - started_at) * 1000)
    fields = " ".join(f"{key}={value}" for key, value in counts.items())
    logger.info("scheduler_job_complete job=%s duration_ms=%s %s", job_name, duration_ms, fields)


def _run_due_reminders_job() -> None:
    started_at = perf_counter()
    logger.info("scheduler_job_start job=run_due_reminders")
    processed = 0
    sent = 0
    failed = 0
    skipped = 0
    for clinic_id in _load_clinic_ids():
        try:
            result = send_due_reminders(clinic_id)
        except Exception as exc:
            logger.error("scheduler_job_error job=run_due_reminders clinic_id=%s error=%s", clinic_id, exc)
            failed += 1
            continue
        processed += result.get("processed_count", 0)
        sent += result.get("sent_count", 0)
        failed += result.get("failed_count", 0)
        skipped += result.get("skipped_count", 0)
    _log_job_result(
        "run_due_reminders",
        started_at,
        processed=processed,
        sent=sent,
        failed=failed,
        skipped=skipped,
    )


def _run_auto_follow_up_job() -> None:
    started_at = perf_counter()
    logger.info("scheduler_job_start job=run_auto_follow_up_tasks")
    created = 0
    failed = 0
    for clinic_id in _load_clinic_ids():
        try:
            result = run_auto_follow_up_tasks(clinic_id)
        except Exception as exc:
            logger.error(
                "scheduler_job_error job=run_auto_follow_up_tasks clinic_id=%s error=%s",
                clinic_id,
                exc,
            )
            failed += 1
            continue
        created += result.get("created_count", 0)
    _log_job_result("run_auto_follow_up_tasks", started_at, created=created, failed=failed)


def _run_retry_failed_jobs() -> None:
    started_at = perf_counter()
    logger.info("scheduler_job_start job=retry_failed_jobs")
    try:
        result = run_retryable_background_jobs()
    except Exception as exc:
        logger.error("scheduler_job_error job=retry_failed_jobs error=%s", exc)
        raise
    _log_job_result(
        "retry_failed_jobs",
        started_at,
        processed=result["processed"],
        completed=result["completed"],
        failed=result["failed"],
    )


def _run_cleanup_job() -> None:
    started_at = perf_counter()
    logger.info("scheduler_job_start job=cleanup_tasks")
    try:
        deleted = cleanup_background_jobs()
    except Exception as exc:
        logger.error("scheduler_job_error job=cleanup_tasks error=%s", exc)
        raise
    _log_job_result("cleanup_tasks", started_at, deleted=deleted)


def start_background_scheduler() -> None:
    global _scheduler

    with _scheduler_lock:
        if _scheduler and _scheduler.running:
            return

        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            _run_due_reminders_job,
            "interval",
            minutes=1,
            id="run_due_reminders",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        scheduler.add_job(
            _run_auto_follow_up_job,
            "interval",
            minutes=5,
            id="run_auto_follow_up_tasks",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        scheduler.add_job(
            _run_retry_failed_jobs,
            "interval",
            minutes=10,
            id="retry_failed_jobs",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        scheduler.add_job(
            _run_cleanup_job,
            "interval",
            hours=6,
            id="cleanup_tasks",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        scheduler.start()
        _scheduler = scheduler
        logger.info("background_scheduler_started jobs=4")


def stop_background_scheduler() -> None:
    global _scheduler

    with _scheduler_lock:
        if not _scheduler:
            return
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("background_scheduler_stopped")


def scheduler_running() -> bool:
    with _scheduler_lock:
        return bool(_scheduler and _scheduler.running)
