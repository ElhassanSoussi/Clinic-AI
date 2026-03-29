(function() {
  // Prevent multiple injections
  if (document.getElementById('clinic-ai-widget-container')) return;

  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error('Clinic AI Widget: Could not locate script tag.');
    return;
  }

  const clinicSlug = scriptTag.getAttribute('data-clinic');
  if (!clinicSlug) {
    console.error('Clinic AI Widget: Missing data-clinic attribute.');
    return;
  }

  // Determine the base URL dynamically from the script tag's src
  const scriptUrl = new URL(scriptTag.src);
  const baseUrl = scriptUrl.origin;
  const chatUrl = `${baseUrl}/chat/${clinicSlug}?embed=true`;

  // Create container
  const container = document.createElement('div');
  container.id = 'clinic-ai-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  // Create iframe wrapper (for rounded corners without scrollbar bleeding)
  const iframeWrapper = document.createElement('div');
  iframeWrapper.style.width = '380px';
  iframeWrapper.style.height = '620px';
  iframeWrapper.style.maxHeight = 'calc(100vh - 100px)';
  iframeWrapper.style.marginBottom = '16px';
  iframeWrapper.style.borderRadius = '16px';
  iframeWrapper.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.25)';
  iframeWrapper.style.backgroundColor = '#ffffff';
  iframeWrapper.style.overflow = 'hidden';
  iframeWrapper.style.display = 'none';
  iframeWrapper.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  iframeWrapper.style.opacity = '0';
  iframeWrapper.style.transform = 'translateY(10px)';

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = chatUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.style.backgroundColor = 'transparent';

  // Responsive adjustments for mobile
  function updateIframeSize() {
    if (window.innerWidth <= 480) {
      iframeWrapper.style.width = 'calc(100vw - 40px)';
      iframeWrapper.style.height = 'calc(100vh - 100px)';
      iframeWrapper.style.maxHeight = 'none';
    } else {
      iframeWrapper.style.width = '380px';
      iframeWrapper.style.height = '620px';
      iframeWrapper.style.maxHeight = 'calc(100vh - 100px)';
    }
  }
  updateIframeSize();
  window.addEventListener('resize', updateIframeSize);

  // Create toggle button
  const button = document.createElement('button');
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '30px';
  button.style.backgroundColor = '#0d9488'; // teal-600
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.4)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.position = 'absolute';
  button.style.bottom = '0';
  button.style.right = '0';
  button.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  // Create icons for open/close state
  const chatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
  const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  button.innerHTML = chatIcon;
  
  // Hover effects
  button.onmouseover = () => {
    if(!isOpen) button.style.transform = 'scale(1.05)';
  };
  button.onmouseout = () => button.style.transform = 'scale(1)';

  let isOpen = false;

  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframeWrapper.style.display = 'block';
      // Trigger reflow
      void iframeWrapper.offsetWidth;
      iframeWrapper.style.opacity = '1';
      iframeWrapper.style.transform = 'translateY(0)';
      button.innerHTML = closeIcon;
      button.style.transform = 'scale(0.9)';
      setTimeout(() => button.style.transform = 'scale(1)', 150);
    } else {
      iframeWrapper.style.opacity = '0';
      iframeWrapper.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (!isOpen) iframeWrapper.style.display = 'none';
      }, 200);
      button.innerHTML = chatIcon;
    }
  };

  // Assemble
  iframeWrapper.appendChild(iframe);
  container.appendChild(iframeWrapper);
  container.appendChild(button);
  document.body.appendChild(container);
})();
