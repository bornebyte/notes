"use client"
import { Home, Inbox, NotebookPen, Settings, Menu, CircleX, Tally5 } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react'

const Sidebar = () => {
    const [toggleSidebar, setToggleSidebar] = useState(false);
    return (
        <div className='w-full h-fit flex flex-col items-end'>
            <button
                onClick={() => setToggleSidebar(!toggleSidebar)}
                className="mx-6 mb-4 p-2 rounded-lg hover:bg-accent transition-all duration-300 hover:scale-110"
                aria-label={toggleSidebar ? "Close menu" : "Open menu"}
            >
                {toggleSidebar ?
                    <CircleX className="text-6xl font-bold transition-all duration-500 rotate-180" />
                    :
                    <Menu className="text-6xl font-bold transition-all duration-500 rotate-0" />
                }
            </button>
            <div className={`w-full md:w-fit md:px-20 overflow-hidden bg-card border rounded-xl z-20 shadow-lg transition-all duration-500 ease-in-out transform origin-top ${toggleSidebar
                ? 'max-h-96 opacity-100 scale-y-100 translate-y-0'
                : 'max-h-0 opacity-0 scale-y-0 -translate-y-4'
                }`}>
                <div className='flex flex-col gap-6 items-center py-10'>
                    <Link
                        href={"/admin"}
                        className='flex items-center justify-center gap-4 hover:bg-accent/50 transition-all duration-300 px-6 py-2 rounded-lg w-full hover:scale-105 hover:translate-x-2 hover:shadow-md'
                        onClick={() => setToggleSidebar(!toggleSidebar)}
                    >
                        <Home />
                        <span>Home</span>
                    </Link>
                    <Link
                        href={"/admin/inbox"}
                        className='flex items-center justify-center gap-4 hover:bg-accent/50 transition-all duration-300 px-6 py-2 rounded-lg w-full hover:scale-105 hover:translate-x-2 hover:shadow-md'
                        onClick={() => setToggleSidebar(!toggleSidebar)}
                    >
                        <Inbox />
                        <span>Inbox</span>
                    </Link>
                    <Link
                        href={"/admin/note"}
                        className='flex items-center justify-center gap-4 hover:bg-accent/50 transition-all duration-300 px-6 py-2 rounded-lg w-full hover:scale-105 hover:translate-x-2 hover:shadow-md'
                        onClick={() => setToggleSidebar(!toggleSidebar)}
                    >
                        <NotebookPen />
                        <span>Notes</span>
                    </Link>
                    <Link
                        href={"/admin/target"}
                        className='flex items-center justify-center gap-4 hover:bg-accent/50 transition-all duration-300 px-6 py-2 rounded-lg w-full hover:scale-105 hover:translate-x-2 hover:shadow-md'
                        onClick={() => setToggleSidebar(!toggleSidebar)}
                    >
                        <Tally5 />
                        <span>Target</span>
                    </Link>
                    <Link
                        href={"/admin/settings"}
                        className='flex items-center justify-center gap-4 hover:bg-accent/50 transition-all duration-300 px-6 py-2 rounded-lg w-full hover:scale-105 hover:translate-x-2 hover:shadow-md'
                        onClick={() => setToggleSidebar(!toggleSidebar)}
                    >
                        <Settings />
                        <span>Settings</span>
                    </Link>
                </div>
            </div>
        </div >
    )
}

export default Sidebar