"use client"

import { useState, useEffect } from "react"
import { Save, MessageSquare } from "lucide-react"
import BackButton from "@/components/BackButton"

export default function IntegrationsSettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState({
        WHATSAPP_ENABLED: false
    })

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings/integrations")
                if (!res.ok) throw new Error("Failed to fetch settings")
                const data = await res.json()

                // Parse the string value stored in the DB back to a boolean
                setSettings({
                    WHATSAPP_ENABLED: data.WHATSAPP_ENABLED === "true"
                })
            } catch (error: any) {
                alert(error.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch("/api/settings/integrations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to save settings")
            }

            alert("Settings saved successfully")
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="p-4">Loading integrations...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <BackButton />
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Integrations</h1>
                    <p className="text-gray-500">Manage third-party services and connections.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
                <div className="p-6">
                    <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                        <h2 className="text-lg font-medium text-gray-900">WhatsApp Alert Notifications</h2>
                    </div>

                    <div className="mt-6 flex items-center justify-between max-w-xl">
                        <div>
                            <span className="text-sm font-medium text-gray-900">Enable Automated Alerts</span>
                            <p className="mt-1 text-sm text-gray-500">
                                When enabled, the system will automatically send Meta WhatsApp Messages for approved quotes, shipped orders, and low stock warnings. Requires API keys in `.env`.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.WHATSAPP_ENABLED}
                                onChange={(e) => setSettings({ ...settings, WHATSAPP_ENABLED: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>
            </div>

        </div>
    )
}
