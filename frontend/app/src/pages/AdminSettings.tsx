import { Card, Divider, Space, Typography, message } from "antd";
import { useState, useCallback, useEffect } from "react";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { useApiAuth } from "../utils/apiContext";
import { Form, Input } from "antd";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const AdminSettings = () => {
    const { getToken } = useAuth();
    const [tenantsExist, setTenantsExist] = useState(true);
    const [seedingStatus, setSeedingStatus] = useState<{
        user_seeding: { in_progress: boolean; last_error?: string; last_complete?: string };
        data_seeding: { in_progress: boolean; last_error?: string; last_complete?: string };
    } | null>(null);

    // Separate state for Documenso configuration
    const [documensoConfig, setDocumensoConfig] = useState({
        apiKey: '',
        webhookSecret: ''
    });

    // Store the entire mutation object so we can access reset() later
    const seedUsersMutation = useMutation({
        mutationFn: async () => {
            const token = await getToken();
            const res = await fetch(`${API_URL}/seed-users`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Failed to seed users");
            }

            return res;
        },
        onSuccess: async () => {
            console.log("✅ Seeding process started");

            // Immediately check status to get initial state
            try {
                const res = await fetch(`${API_URL}/seed-users/status`);
                if (res.ok) {
                    const data = await res.json();
                    setSeedingStatus(data);
                }
            } catch (error) {
                console.error("Failed to get initial seeding status", error);
            }
        },
        onError: (e: any) => {
            console.log("❌ Error seeding users:", e);
        },
    });

    // Extract commonly used properties for convenience
    const seedStatus = seedUsersMutation.status;

    const checkTenants = useCallback(async () => {
        console.log("🔎 Starting tenant existence check");

        // Check session storage for cached tenant existence
        try {
            const cachedTenantStatus = sessionStorage.getItem('tenants_exist');
            const lastChecked = sessionStorage.getItem('tenants_checked_time');
            const now = Date.now();

            // Use cached status if it's less than 5 minutes old
            if (cachedTenantStatus && lastChecked && (now - parseInt(lastChecked, 10)) < 5 * 60 * 1000) {
                console.log('📁 Using cached tenant existence status:', cachedTenantStatus);
                setTenantsExist(cachedTenantStatus === 'true');
                return;
            }
        } catch (err) {
            // If there's an error reading from storage, continue with the API check
            console.warn('Failed to read cached tenant status', err);
        }

        try {
            // Use the server's seeding status as the primary source of truth
            // This is the most reliable way to know if we have demo data
            const seedStatusResponse = await fetch(`${API_URL}/seed-users/status`);

            if (seedStatusResponse.ok) {
                try {
                    const seedStatus = await seedStatusResponse.json();
                    console.log('📊 Seed status response:', seedStatus);

                    // If seeding has been completed before, we definitely have data
                    if (seedStatus && seedStatus.user_seeding && seedStatus.user_seeding.last_complete) {
                        console.log('✅ Found completed seeding record, marking tenants as existing');

                        // Cache this result for 5 minutes
                        sessionStorage.setItem('tenants_exist', 'true');
                        sessionStorage.setItem('tenants_checked_time', Date.now().toString());
                        setTenantsExist(true);
                        return;
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to parse seed status response:', error);
                }
            }

            // If we get here, try the authenticated check-admin endpoint (fallback)
            const token = await getToken();
            const adminCheckResponse = await fetch(`${API_URL}/auth/check-admin`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (adminCheckResponse.ok) {
                try {
                    const adminData = await adminCheckResponse.json();
                    console.log("📋 Admin check response:", adminData);

                    // Explicitly check for tenant existence flag
                    if (adminData.tenants_exist) {
                        console.log("✅ Admin check confirms tenants exist");

                        // Cache this result for 5 minutes
                        sessionStorage.setItem('tenants_exist', 'true');
                        sessionStorage.setItem('tenants_checked_time', Date.now().toString());
                        setTenantsExist(true);
                        return;
                    }

                    // Also check if we have any admin_exists info
                    if (adminData.admin_exists) {
                        console.log("✅ Admin exists, likely tenants exist too");

                        // Cache this result for 5 minutes
                        sessionStorage.setItem('tenants_exist', 'true');
                        sessionStorage.setItem('tenants_checked_time', Date.now().toString());
                        setTenantsExist(true);
                        return;
                    }
                } catch (parseErr) {
                    console.warn("⚠️ Failed to parse admin check response:", parseErr);
                }
            }

            // If we get here, we know there are no tenants
            console.log("❓ No tenants found based on API checks");

            // Cache this result for 1 minute (shorter time since this can change when users are added)
            sessionStorage.setItem('tenants_exist', 'false');
            sessionStorage.setItem('tenants_checked_time', Date.now().toString());
            setTenantsExist(false);

        } catch (err) {
            console.error("❌ Error checking for tenants:", err);
            // Default to true on error - safer to assume data exists than wipe it out

            // Cache the fallback status, but only for a short time
            sessionStorage.setItem('tenants_exist', 'true');
            sessionStorage.setItem('tenants_checked_time', Date.now().toString());
            setTenantsExist(true);
        }
    }, [API_URL, getToken]);

    // Poll seeding status when needed
    useEffect(() => {
        let intervalId: number | undefined;
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max polling (60 * 2 sec)

        // Start polling in these cases:
        // 1. Initial seeding request was successful
        // 2. Seeding is in progress according to status
        const shouldPoll =
            seedStatus === 'success' ||
            (seedingStatus && seedingStatus.user_seeding.in_progress);

        if (shouldPoll && (!seedingStatus || !seedingStatus.user_seeding.last_complete || seedingStatus.user_seeding.in_progress)) {
            intervalId = window.setInterval(async () => {
                attempts++;
                try {
                    // No authentication needed for status check
                    const res = await fetch(`${API_URL}/seed-users/status`);
                    if (res.ok) {
                        const data = await res.json();
                        setSeedingStatus(data);

                        // If seeding is complete or we've reached max attempts
                        if (!data.user_seeding.in_progress || attempts >= maxAttempts) {
                            clearInterval(intervalId);
                            // Refresh tenant status
                            checkTenants();

                            // If seeding just completed, automatically hide the success message after 3 seconds
                            if (!data.user_seeding.in_progress && data.user_seeding.last_complete) {
                                setTimeout(() => {
                                    // This will remove the success status, which hides the alert
                                    // while keeping the button in "Add More Demo Users" state
                                    if (seedStatus === 'success') {
                                        // Reset the seed mutation status to hide the success message
                                        seedUsersMutation.reset();
                                    }
                                }, 3000);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to check seeding status", err);
                    if (attempts >= 5) { // Stop polling after 5 consecutive errors
                        clearInterval(intervalId);
                    }
                }
            }, 2000); // Poll every 2 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [seedStatus, seedingStatus, API_URL, checkTenants, seedUsersMutation]);

    // Check for tenants on initial load and when authenticated
    const { isAuthenticated } = useApiAuth();

    // Add debug output to track tenant existence state
    useEffect(() => {
        console.log('🧪 CURRENT TENANT EXISTENCE STATE:', tenantsExist);
    }, [tenantsExist]);

    // Check for completed seeding status
    useEffect(() => {
        // Check on initial load and whenever seedingStatus changes
        console.log('🧪 Current seeding status:', seedingStatus);

        // If we have a completed seed operation, force tenants to exist
        if (seedingStatus && seedingStatus.user_seeding.last_complete && !seedingStatus.user_seeding.in_progress) {
            console.log('✅ Previous seeding detected, marking tenants as existing');
            setTenantsExist(true);
        }
    }, [seedingStatus]);

    // Fetch seeding status on page load to ensure we have accurate state
    useEffect(() => {
        const checkSeedingStatus = async () => {
            if (isAuthenticated) {
                try {
                    console.log('🔍 Checking seeding status on page load');
                    const res = await fetch(`${API_URL}/seed-users/status`);
                    if (res.ok) {
                        const data = await res.json();
                        console.log('📊 Seeding status from server:', data);
                        setSeedingStatus(data);

                        // If seeding has completed before, tenants exist
                        if (data.user_seeding.last_complete) {
                            console.log('✅ Found previous seeding record, tenants must exist');
                            setTenantsExist(true);
                        }
                    }
                } catch (error) {
                    console.error('❌ Failed to check seeding status:', error);
                }
            }
        };

        checkSeedingStatus();
    }, [API_URL, isAuthenticated]);

    useEffect(() => {
        // Only run the check when authentication is ready, which 
        // ensures API requests will have proper auth headers
        if (isAuthenticated) {
            console.log("🔍 Checking for tenants on authenticated load");
            // Force reset tenant existence state to ensure fresh check
            setTenantsExist(false);
            checkTenants();
        }
    }, [checkTenants, isAuthenticated]);

    // Mutation for handling Documenso configuration
    const { mutate: updateDocumensoConfig, status: documensoStatus } = useMutation({
        mutationFn: async (configData: { apiKey: string, webhookSecret: string }) => {
            console.log("Updating Documenso configuration");

            // Retry up to 3 times with increasing delay
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const token = await getToken();
                    if (!token) {
                        console.log(`[Attempt ${attempt + 1}] Waiting for auth token...`);
                        // Wait before retry (exponential backoff)
                        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        continue;
                    }

                    console.log(`[Attempt ${attempt + 1}] Updating Documenso config`);
                    const res = await fetch(`${API_URL}/admin/config/documenso`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(configData),
                    });

                    console.log(res);

                    if (!res.ok) {
                        // For auth failures, try again
                        if (res.status === 401) {
                            console.log(`[Attempt ${attempt + 1}] Auth failed, retrying...`);
                            if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                            continue;
                        }
                        throw new Error(`Failed to update Documenso configuration: ${res.statusText}`);
                    }

                    return res;
                } catch (err) {
                    // If this is the last attempt, throw the error
                    if (attempt === 2) throw err;
                    console.log(`[Attempt ${attempt + 1}] Failed, retrying... Error: ${err}`);
                    // Wait before retry (exponential backoff)
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
            throw new Error("Failed to update Documenso configuration after multiple attempts");
        },
        onSuccess: () => {
            console.log("✅ Documenso configuration updated successfully");
            message.success('Documenso configuration updated successfully!');
        },
        onError: (e: any) => {
            console.log("❌ Error updating Documenso configuration:", e);
            message.error('Failed to update Documenso configuration');
        },
    });

    // New handler for Documenso configuration update
    const handleUpdateDocumensoConfig = () => {
        console.log("Updating Documenso configuration");
        updateDocumensoConfig({
            apiKey: documensoConfig.apiKey,
            webhookSecret: documensoConfig.webhookSecret
        });
    };

    const handleFormValuesChange = (_: any, allValues: any) => {
        // Update Documenso config separately
        if (allValues["documenso-settings"]) {
            setDocumensoConfig({
                apiKey: allValues["documenso-settings"]?.apiKey || '',
                webhookSecret: allValues["documenso-settings"]?.webhookSecret || '',
            });
        }
    };

    return (
        <div className="container">
            <PageTitleComponent title="Application Settings" />

            <Form
                onValuesChange={handleFormValuesChange}
                layout="vertical"
                initialValues={{
                    "documenso-settings": {
                        apiKey: documensoConfig.apiKey,
                        webhookSecret: documensoConfig.webhookSecret,
                    },
                }}
            >

                <Divider orientation="left">User Management</Divider>
                <div className="mb-4">
                    <Space direction="vertical" className="w-full">
                        <ButtonComponent
                            type="primary"
                            title={seedingStatus && seedingStatus.user_seeding.in_progress
                                // If actively seeding
                                ? "Seeding Demo Data (This may take a minute)..."
                                // If we have a record of previous seeding OR tenants exist
                                : (seedingStatus && seedingStatus.user_seeding.last_complete) || tenantsExist
                                    ? "Add More Demo Users & Data"
                                    // Otherwise, no data exists yet
                                    : "Initialize Full Demo Environment (Tenants, Complaints, Work Orders)"}
                            onClick={() => seedUsersMutation.mutate()}
                            loading={seedStatus === "pending" || (seedingStatus ? seedingStatus.user_seeding.in_progress : false)}
                            disabled={seedStatus === "pending" || (seedingStatus ? seedingStatus.user_seeding.in_progress : false)}
                        />

                        {seedingStatus && seedingStatus.user_seeding.last_error && (
                            <AlertComponent
                                type="error"
                                title="Error Seeding Users"
                                message={seedingStatus.user_seeding.last_error}
                                description=""
                            />
                        )}

                        {/* Only show success alert during the transition right after completion */}
                        {seedingStatus &&
                            seedingStatus.user_seeding.last_complete &&
                            !seedingStatus.user_seeding.in_progress &&
                            seedUsersMutation.isSuccess && (
                                <AlertComponent
                                    type="success"
                                    title="Seeding Complete"
                                    message={`Last seeding completed at: ${new Date(seedingStatus.user_seeding.last_complete).toLocaleString()}`}
                                    description=""
                                />
                            )}
                    </Space>
                </div>

                {/* Documenso Integration Settings */}
                <Divider orientation="left">Document Signing Integration</Divider>

                <Card className="mb-4">
                    <Space direction="vertical" size="small" className="w-100">
                        <Typography.Title level={5}>Documenso Configuration</Typography.Title>
                        <Typography.Text type="secondary">Configure connection to Documenso for digital document signing.</Typography.Text>

                        <Form.Item
                            label="Documenso API Key"
                            name={["documenso-settings", "apiKey"]}
                            tooltip="The API key generated from your Documenso admin dashboard"
                            rules={[{ required: false, message: "Please enter your Documenso API key" }]}>
                            <Input.Password
                                placeholder="Enter Documenso API key (e.g., api_xxxxxxxxxxxxxxxx)"
                                visibilityToggle={{ visible: false }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Documenso Webhook Secret"
                            name={["documenso-settings", "webhookSecret"]}
                            tooltip="The webhook secret for validating callbacks from Documenso"
                            rules={[{ required: false, message: "Please enter your Documenso webhook secret" }]}>
                            <Input.Password
                                placeholder="Enter webhook secret"
                                visibilityToggle={{ visible: false }}
                            />
                        </Form.Item>

                        <AlertComponent
                            title="How to set up Documenso integration"
                            message="Integration steps"
                            description={
                                "1. API Key: Login to Documenso dashboard → Settings → API → Generate key\n\n" +
                                "2. Webhook Secret: Use 'Generate Webhook Secret' button below, then in Documenso go to Settings → Webhooks\n\n" +
                                `3. Create webhook with URL: ${import.meta.env.VITE_ENV === "development" ? "http://rentdaddy-backend:8080" : "https://api.curiousdev.net"}/webhooks/documenso\n\n` +
                                "4. Select events: document.completed, document.signed"
                            }
                            type="info"
                        />

                        <Space>
                            <ButtonComponent
                                type="default"
                                title="Generate Webhook Secret"
                                onClick={() => {
                                    // Generate a random webhook secret
                                    const array = new Uint8Array(32);
                                    window.crypto.getRandomValues(array);
                                    const webhookSecret = Array.from(array)
                                        .map(b => b.toString(16).padStart(2, "0"))
                                        .join("");

                                    // Find the webhook secret input and set its value
                                    const secretInput = document.querySelector('input[placeholder="Enter webhook secret"]') as HTMLInputElement;
                                    if (secretInput) {
                                        secretInput.value = webhookSecret;
                                        // Trigger change event to update form state
                                        const event = new Event('input', { bubbles: true });
                                        secretInput.dispatchEvent(event);
                                    }

                                    // Also update our state
                                    setDocumensoConfig(prev => ({
                                        ...prev,
                                        webhookSecret: webhookSecret
                                    }));

                                    // Show a success message
                                    message.success('Webhook secret generated! Copy this to Documenso.');
                                }}
                            />

                            <ButtonComponent
                                type="primary"
                                title="Update Documenso Configuration"
                                onClick={handleUpdateDocumensoConfig}
                                loading={documensoStatus === 'pending'}
                            />
                        </Space>
                    </Space>
                </Card>
            </Form>
        </div>
    );
};

export default AdminSettings;