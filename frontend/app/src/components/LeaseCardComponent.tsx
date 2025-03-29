import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin } from 'antd';
import { FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import { CardComponent } from '../components/reusableComponents/CardComponent';
import ButtonComponent from '../components/reusableComponents/ButtonComponent';
import { useAuth } from '@clerk/react-router';
import { useQuery } from '@tanstack/react-query';

const LeaseCard = () => {
    const [isLeaseModalVisible, setIsLeaseModalVisible] = useState(false);
    const [leaseDocument, setLeaseDocument] = useState(null);
    const { userId, getToken } = useAuth();
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const absoluteServerUrl = `${serverUrl}`;

    // Fetch lease status and URL using TanStack Query
    const { data: leaseData, isLoading, isError } = useQuery({
        queryKey: ["leaseStatus", userId],
        queryFn: async () => {
            if (!userId) {
                console.log("userId is not available");
                return null;
            }

            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${userId}/signing-url`);
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

            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${leaseData.leaseId}/document`);
            if (!response.ok) {
                console.error("Error fetching signed lease document:", response.statusText);
                return null;
            }

            return await response.json();
        },
        enabled: !!leaseData?.leaseId && leaseData.status === 'active',
    });

    const handleViewLease = () => {
        if (leaseData?.status === 'active' && signedLeaseData?.lease_pdf_s3) {
            // Open signed lease document in new tab
            window.open(signedLeaseData.lease_pdf_s3, '_blank');
        } else if (leaseData?.url) {
            // Open the signing URL if available
            window.open(leaseData.url, '_blank');
        } else {
            // Open modal if no URLs available
            setIsLeaseModalVisible(true);
        }
    };

    let buttonTitle = "View Lease";
    let buttonDisabled = false;
    let cardDescription = "View or resign your lease";
    let actionIcon = <FileTextOutlined className="icon" />;

    // Determine button title and description based on lease status
    if (isLoading || isLoadingSignedLease) {
        buttonTitle = "Loading...";
        buttonDisabled = true;
        cardDescription = "Checking lease status...";
    } else if (leaseData) {
        switch (leaseData.status) {
            case 'pending_approval':
                buttonTitle = "Sign Lease";
                cardDescription = "Your lease requires signing";
                actionIcon = <WarningOutlined className="icon" style={{ color: '#faad14' }} />;
                break;
            case 'active':
                buttonTitle = "View Lease";
                cardDescription = "View your active lease";
                break;
            case 'terminated':
            case 'expired':
                buttonTitle = "Lease Expired";
                cardDescription = "Contact management to renew your lease";
                buttonDisabled = true;
                break;
            case 'draft':
                buttonTitle = "Lease Pending";
                cardDescription = "Your lease is being prepared";
                buttonDisabled = true;
                break;
            default:
                buttonTitle = "Contact Management";
                cardDescription = "No active lease found";
                buttonDisabled = true;
        }
    }

    return (
        <>
            <CardComponent
                title="Lease"
                description={cardDescription}
                hoverable={true}
                icon={actionIcon}
                button={
                    <ButtonComponent
                        title={buttonTitle}
                        type="primary"
                        onClick={handleViewLease}
                        disabled={buttonDisabled}
                    />
                }
            />

            {/* Informational Modal when no lease URL is available */}
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