import type { ComponentPropsWithoutRef } from 'react';

type Components = {
  [key: string]: React.ComponentType<ComponentPropsWithoutRef<any>>;
};

export function useMDXComponents(components: Components): Components {
  return { ...components };
}
