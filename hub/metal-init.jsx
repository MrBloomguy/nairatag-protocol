import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MetalFx, useMetalBend, isMetalFxSupported } from 'metal-fx';

function MetalActionButton({
  targetId,
  className,
  initialHtml,
  onClick,
  preset = 'chromatic',
  strength = 1,
  innerShadow = true,
}) {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  });
  const metalRef = useRef(null);

  try {
    useMetalBend(metalRef);
  } catch (e) {
    // Non-fatal if bend filter encounters canvas limitation
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <MetalFx
      ref={metalRef}
      preset={preset}
      strength={strength}
      variant="button"
      innerShadow={innerShadow}
      theme={theme}
      style={{ width: '100%', display: 'flex', position: 'relative' }}
    >
      <button
        type="button"
        id={targetId}
        className={className}
        onClick={onClick}
        style={{ width: '100%' }}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </MetalFx>
  );
}

export function initMetalButtons() {
  if (typeof document === 'undefined') return;

  if (!isMetalFxSupported()) {
    console.info('[metal-fx] WebGL2 not supported in this browser, using fallback button.');
    return;
  }

  const mountElements = document.querySelectorAll('[data-metal-button]');
  mountElements.forEach((mountEl) => {
    if (mountEl.__metalMounted) return;
    mountEl.__metalMounted = true;

    const targetId = mountEl.getAttribute('data-target-id');
    const className = mountEl.getAttribute('data-class') || '';
    const actionName = mountEl.getAttribute('data-action') || '';
    const preset = mountEl.getAttribute('data-preset') || 'chromatic';
    const strength = parseFloat(mountEl.getAttribute('data-strength') || '1');

    const originalBtn = mountEl.querySelector('button');
    const initialHtml = originalBtn ? originalBtn.innerHTML : (mountEl.getAttribute('data-label') || 'Confirm');

    const handleClick = (e) => {
      if (typeof window[actionName] === 'function') {
        window[actionName](e);
      } else if (actionName) {
        try {
          const fn = new Function(actionName.includes('(') ? actionName : `${actionName}()`);
          fn.call(e.currentTarget);
        } catch (err) {
          console.error('Metal button action error:', err);
        }
      }
    };

    mountEl.innerHTML = '';
    const root = createRoot(mountEl);
    root.render(
      <MetalActionButton
        targetId={targetId}
        className={className}
        initialHtml={initialHtml}
        onClick={handleClick}
        preset={preset}
        strength={strength}
        innerShadow={true}
      />
    );
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetalButtons);
  } else {
    initMetalButtons();
  }
}
