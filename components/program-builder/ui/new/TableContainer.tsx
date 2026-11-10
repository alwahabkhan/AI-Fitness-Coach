export default function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="shadow-[0px_1px_13.4px_0px_#0000002B] rounded-xl px-2 py-6 lg:p-6 flex flex-col gap-7.5">
      {children}
    </div>
  );
}
