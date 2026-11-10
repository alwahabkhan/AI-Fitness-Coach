export default function TableSuperContainer({ children }: { children: React.ReactNode }) {
    return <div className="bg-white border border-[#CBD5E1] rounded-2xl my-8 py-4 px-2 lg:p-4">
        {children}
    </div>
}