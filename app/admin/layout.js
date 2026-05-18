import Sidebar from "./Sidebar";
import PushRegistration from "@/components/PushRegistration";

export default async function AdminLayout({ children }) {
    return (
        <main>
            <div className="w-full flex justify-end">
                <Sidebar />
            </div>
            <PushRegistration />
            {children}
        </main>
    )
}