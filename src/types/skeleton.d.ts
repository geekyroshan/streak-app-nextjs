declare module '@/components/ui/skeleton' {
  interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
  }
 
  export function Skeleton(props: SkeletonProps): JSX.Element;
} 