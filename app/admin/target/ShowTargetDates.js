"use client"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button";
import { Share, Link, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";

const ShowTargetDates = ({ targetdates, onRefresh }) => {
    const router = useRouter();

    const handleGenShareID = async (id) => {
        try {
            const response = await fetch('/api/targets/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await response.json();
            if (data.success && data.shareid) {
                toast({
                    title: "Share ID Generated",
                    description: data.shareid,
                    action: (
                        <ToastAction altText="Copy Share ID" onClick={() => navigator.clipboard.writeText(`https://notes.shubham-shah.com.np/target-view/${data.shareid}`)}>Copy</ToastAction>
                    ),
                });
            } else {
                toast({ title: "Error generating share ID." });
            }
        } catch (error) {
            toast({ title: "Error generating share ID." });
        }
        if (onRefresh) await onRefresh();
        router.refresh();
    }

    const handleCopyShareID = async (shareid) => {
        navigator.clipboard.writeText(`https://notes.shubham-shah.com.np/target-view/${shareid}`)
        if (shareid != null) {
            toast({
                title: "Share ID Copied to clipboard"
            });
        } else {
            toast({ title: "Error copying share ID." });
        }
        router.refresh();
    }

    const handleDelete = async (id) => {
        try {
            const response = await fetch('/api/targets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await response.json();
            if (data.success) {
                toast({ title: "Target deleted successfully." });
            } else {
                toast({ title: "Error deleting target." });
            }
        } catch (error) {
            toast({ title: "Error deleting target." });
        }
        if (onRefresh) await onRefresh();
        router.refresh();
    }

    return (
        <Accordion type="single" collapsible>
            {targetdates && targetdates.map((row) => {
                return (
                    <AccordionItem value={row.id} key={row.id}>
                        <AccordionTrigger>{row.message}</AccordionTrigger>
                        <AccordionContent>
                            <div>
                                <p className="text-gray-400 text-sm">
                                    {row.shareid}
                                </p>
                                <p>Target Date: {row.date} </p>
                                <p>Created At: {row.created_at} </p>
                                <p><span className="text-red-500"> {row.days} days </span> {row.hours} hours {row.minutes} minutes left.</p>
                                <Progress value={row.progressPercentage} className="w-[60%] my-4" />
                                <div className="flex items-center justify-start gap-4 mt-4">
                                    <Button variant="destructive" onClick={() => { handleDelete(row.id) }}><Trash /></Button>
                                    <Button className="bg-transparent text-white hover:text-black" onClick={() => { handleGenShareID(row.id) }}><Share /></Button>
                                    <Button className="bg-transparent text-white hover:text-black" onClick={() => { handleCopyShareID(row.shareid) }}><Link /></Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })
            }
        </Accordion>
    )
}

export default ShowTargetDates