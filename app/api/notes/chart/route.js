import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year') || new Date().getFullYear().toString();

        const data = await sql.query("select * from notes where trash=FALSE");

        let obj = [
            { month: "January", count: 0 },
            { month: "February", count: 0 },
            { month: "March", count: 0 },
            { month: "April", count: 0 },
            { month: "May", count: 0 },
            { month: "June", count: 0 },
            { month: "July", count: 0 },
            { month: "August", count: 0 },
            { month: "September", count: 0 },
            { month: "October", count: 0 },
            { month: "November", count: 0 },
            { month: "December", count: 0 }
        ];

        data.map((i) => {
            const dateParts = i.created_at.split('/');
            const noteYear = dateParts[2]?.split(',')[0];

            // Only count notes from the selected year
            if (noteYear !== year) return;

            switch (dateParts[0]) {
                case "1":
                    obj[0].count++;
                    break;
                case "2":
                    obj[1].count++;
                    break;
                case "3":
                    obj[2].count++;
                    break;
                case "4":
                    obj[3].count++;
                    break;
                case "5":
                    obj[4].count++;
                    break;
                case "6":
                    obj[5].count++;
                    break;
                case "7":
                    obj[6].count++;
                    break;
                case "8":
                    obj[7].count++;
                    break;
                case "9":
                    obj[8].count++;
                    break;
                case "10":
                    obj[9].count++;
                    break;
                case "11":
                    obj[10].count++;
                    break;
                case "12":
                    obj[11].count++;
                    break;
            }
        });

        return NextResponse.json(obj);
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json([], { status: 500 });
    }
}
