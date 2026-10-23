import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[#080F1D] group-[.toaster]:text-[#F5F7FF] group-[.toaster]:border-[#101B2B] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[#94A3B8]',
          actionButton:
            'group-[.toast]:bg-[#7919F5] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-[#101B2B] group-[.toast]:text-[#94A3B8]'
        },
        style: {
          background: '#080F1D',
          border: '1px solid #101B2B',
          color: '#F5F7FF'
        }
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
