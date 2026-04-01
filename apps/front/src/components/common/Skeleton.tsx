export function SkeletonLine({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height: '1rem',
        borderRadius: '0.25rem',
        backgroundColor: 'var(--background-contrast-grey)',
      }}
    />
  );
}
