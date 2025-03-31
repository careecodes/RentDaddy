import { JSX, useState, useEffect } from 'react';
import { Modal, Button, Spin } from 'antd';
import { FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import { CardComponent } from '../components/reusableComponents/CardComponent';
import ButtonComponent from '../components/reusableComponents/ButtonComponent';
import { useAuth } from '@clerk/react-router';
import { useQuery } from '@tanstack/react-query';

// Define UI state types
interface LeaseCardState {
    buttonTitle: string;
    buttonDisabled: boolean;
    cardDescription: string;
    actionIcon: JSX.Element;
}

const LeaseCard = () => {
    const [isLeaseModalVisible, setIsLeaseModalVisible] = useState(false);
    const [leaseDocument, setLeaseDocument] = useState<Blob | null>(null);
    const { userId, getToken } = useAuth();
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const absoluteServerUrl = `${serverUrl}`;

    // UI state management
    const [uiState, setUiState] = useState<LeaseCardState>({
        buttonTitle: "View Lease",
        buttonDisabled: false,
        cardDescription: "View or resign your lease",
        actionIcon: <FileTextOutlined className="icon" />
    });

    // Fetch lease status and URL using TanStack Query
    const { data: leaseData, isLoading, isError } = useQuery({
        queryKey: ["leaseStatus", userId],
        queryFn: async () => {
            if (!userId) {
                console.log("userId is not available");
                return null;
            }

            const token = await getToken();
            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${userId}/signing-url`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error("Error fetching lease data:", response.statusText);
                return null;
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error("Response is not JSON");
                return null;
            }

            return await response.json();
        },
        enabled: !!userId,
    });

    // Fetch signed lease document if needed
    const { data: signedLeaseData, isLoading: isLoadingSignedLease } = useQuery({
        queryKey: ["signedLease", leaseData?.leaseId],
        queryFn: async () => {
            if (!leaseData?.leaseId || leaseData.status !== 'active') {
                return null;
            }

            // Get auth token for secure requests
            const token = await getToken();

            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${leaseData.leaseId}/document`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error("Error fetching signed lease document:", response.statusText);
                return null;
            }

            const data = await response.json();
            return data;
        },
        enabled: !!leaseData?.leaseId && leaseData.status === 'active',
    });

    // Effect to fetch PDF when signed lease data is available
    useEffect(() => {
        const fetchPdf = async () => {
            if (signedLeaseData?.lease_pdf_s3) {
                try {
                    const token = await getToken();
                    const pdfResponse = await fetch(signedLeaseData.lease_pdf_s3, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    const pdfBlob = await pdfResponse.blob();
                    setLeaseDocument(pdfBlob);
                } catch (error) {
                    console.error("Error fetching PDF content:", error);
                }
            }
        };

        fetchPdf();
    }, [signedLeaseData, getToken]);

    // Effect to update UI state based on query results
    useEffect(() => {
        // Handle error state
        if (isError) {
            setUiState({
                buttonTitle: "Error",
                buttonDisabled: true,
                cardDescription: "An error occurred while fetching lease data.",
                actionIcon: <WarningOutlined className="icon" style={{ color: '#ff4d4f' }} />
            });
            return;
        }

        // Handle loading state
        if (isLoading || isLoadingSignedLease) {
            setUiState({
                buttonTitle: "Loading...",
                buttonDisabled: true,
                cardDescription: "Checking lease status...",
                actionIcon: <FileTextOutlined className="icon" />
            });
            return;
        }

        // Handle lease data state
        if (leaseData) {
            switch (leaseData.status) {
                case 'pending_approval':
                    setUiState({
                        buttonTitle: "Sign Lease",
                        buttonDisabled: false,
                        cardDescription: "Your lease requires signing",
                        actionIcon: <WarningOutlined className="icon" style={{ color: '#faad14' }} />
                    });
                    break;
                case 'active':
                    setUiState({
                        buttonTitle: "View Lease",
                        buttonDisabled: false,
                        cardDescription: "View your active lease",
                        actionIcon: <FileTextOutlined className="icon" />
                    });
                    break;
                case 'terminated':
                case 'expired':
                    setUiState({
                        buttonTitle: "Lease Expired",
                        buttonDisabled: true,
                        cardDescription: "Contact management to renew your lease",
                        actionIcon: <FileTextOutlined className="icon" />
                    });
                    break;
                case 'draft':
                    setUiState({
                        buttonTitle: "Lease Pending",
                        buttonDisabled: true,
                        cardDescription: "Your lease is being prepared",
                        actionIcon: <FileTextOutlined className="icon" />
                    });
                    break;
                default:
                    setUiState({
                        buttonTitle: "Contact Management",
                        buttonDisabled: true,
                        cardDescription: "No active lease found",
                        actionIcon: <FileTextOutlined className="icon" />
                    });
            }
        }
    }, [leaseData, isLoading, isLoadingSignedLease, isError]);

    const handleViewLease = () => {
        if (leaseData?.status === 'active') {
            if (leaseDocument) {
                const objectUrl = URL.createObjectURL(leaseDocument);
                window.open(objectUrl, '_blank');
                URL.revokeObjectURL(objectUrl);
            } else if (signedLeaseData?.lease_pdf_s3) {
                window.open(signedLeaseData.lease_pdf_s3, '_blank');
            }
        } else if (leaseData?.url) {
            window.open(leaseData.url, '_blank');
        } else {
            setIsLeaseModalVisible(true);
        }
    };

    return (
        <>
            <CardComponent
                title="Lease"
                description={uiState.cardDescription}
                hoverable={true}
                icon={uiState.actionIcon}
                button={
                    <ButtonComponent
                        title={uiState.buttonTitle}
                        type="primary"
                        onClick={handleViewLease}
                        disabled={uiState.buttonDisabled}
                    />
                }
            />

            <Modal
                title="Lease Information"
                open={isLeaseModalVisible}
                onCancel={() => setIsLeaseModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsLeaseModalVisible(false)}>
                        Close
                    </Button>
                ]}
            >
                <div style={{ textAlign: "center" }}>
                    {isLoading ? (
                        <Spin size="large" />
                    ) : (
                        <>
                            <p>
                                {leaseData
                                    ? `Your lease status is currently: ${leaseData.status}`
                                    : "No lease information is available at this time."}
                            </p>
                            <p>
                                Please contact property management for assistance with your lease.
                            </p>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default LeaseCard;