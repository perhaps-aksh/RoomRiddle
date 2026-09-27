import {useContext, useEffect, useRef} from 'react';
import {BackInterceptorContext} from './TVNavigation';

/**
 * Register a handler for the remote's Back button while the calling screen is visible.
 * Return true to consume the press; return false to fall through to normal Back.
 */
export function useBackInterceptor(handler: () => boolean): void {
  const registry = useContext(BackInterceptorContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    registry.set(() => handlerRef.current());
    return () => registry.set(null);
  }, [registry]);
}
