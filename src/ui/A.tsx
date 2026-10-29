import type { ComponentChildren, TargetedMouseEvent } from 'preact';
import { go } from '../lib/router';

interface Props {
  href: string;
  replace?: boolean;
  class?: string;
  current?: boolean;
  label?: string;
  children: ComponentChildren;
}

/** In-app link: a real href for the browser, navigation through the router. */
export function A({ href, replace, class: cls, current, label, children }: Props) {
  const onClick = (e: TargetedMouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(href, { replace });
  };
  return (
    <a href={href} class={cls} aria-current={current ? 'page' : undefined} aria-label={label} onClick={onClick}>
      {children}
    </a>
  );
}
