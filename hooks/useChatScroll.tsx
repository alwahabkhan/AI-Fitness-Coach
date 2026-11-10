import { RefObject, useEffect, useRef, useState } from 'react';

export function useChatScroll<T>(
  dep: T,
  options: boolean | ScrollIntoViewOptions
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const [optionsState] = useState(options);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [dep, optionsState]);

  return ref;
}
