import { JSX, useState, useEffect } from 'react';
import { Modal, Button, Spin, Tag, Alert, Space, Typography, Row, Col } from 'antd';
import { 
    FileTextOutlined, 
    WarningOutlined, 
    CheckCircleOutlined, 
    ClockCircleOutlined, 
    CloseCircleOutlined,
    MailOutlined
} from '@ant-design/icons';
import { CardComponent } from '../components/reusableComponents/CardComponent';
import ButtonComponent from '../components/reusableComponents/ButtonComponent';
import AlertComponent from './reusableComponents/AlertComponent';
import { useAuth } from '@clerk/react-router';
import { useQuery } from '@tanstack/react-query';
import { SERVER_API_URL } from '../utils/apiConfig';

const { Title, Paragraph, Text } = Typography;

// Define UI state types
interface LeaseCardState {
    buttonTitle: string;
    buttonDisabled: boolean;
    cardDescription: string;
    actionIcon: JSX.Element;
    showAlert: boolean;
    alertType: 'success' | 'info' | 'warning' | 'error';
    alertMessage: string;
    alertDescription?: string;
}

// Enhanced lease data interface
interface EnhancedLeaseData {
    status: string;
    url: string;
    leaseId?: number;
    expirationDate?: string; // ISO date string
    documensoViewUrl?: string; // URL for viewing the document in Documenso
}

// Props for the LeaseCard component
interface LeaseCardProps {
    // Optional external lease data - if provided, we won't run our own query
    externalLeaseData?: {
        status: string;
        url: string;
    };
}

const LeaseCard = ({ externalLeaseData }: LeaseCardProps = {}) => {
    const [isLeaseModalVisible, setIsLeaseModalVisible] = useState(false);
    // State for the full-screen modal that blocks portal access for critical statuses
    const [isBlockingModalVisible, setIsBlockingModalVisible] = useState(false);
    const [leaseDocument, setLeaseDocument] = useState<Blob | null>(null);
    const { userId, getToken } = useAuth();
    const absoluteServerUrl = SERVER_API_URL;

    // UI state management
    const [uiState, setUiState] = useState<LeaseCardState>({
        buttonTitle: "View Lease",
        buttonDisabled: false,
        cardDescription: "View or sign your lease",
        actionIcon: <FileTextOutlined className="icon" />,
        showAlert: false,
        alertType: 'info',
        alertMessage: ''
    });

    // Fetch lease status and URL using TanStack Query if external data not provided
    const { data: leaseData, isLoading, isError } = useQuery<EnhancedLeaseData>({
        queryKey: ["leaseStatus", userId],
        queryFn: async () => {
            // If we have external data, don't run the query
            if (externalLeaseData) {
                return externalLeaseData as EnhancedLeaseData;
            }
            
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
        // Don't run this query if we have external data
        enabled: !!userId && !externalLeaseData,
    });
    
    // If we have external data, use it directly
    const effectiveLeaseData = externalLeaseData || leaseData;

    // Fetch signed lease document if needed
    const { data: signedLeaseData, isLoading: isLoadingSignedLease } = useQuery({
        queryKey: ["signedLease", effectiveLeaseData?.leaseId],
        queryFn: async () => {
            if (!effectiveLeaseData?.leaseId || effectiveLeaseData.status !== 'active') {
                return null;
            }

            // Get auth token for secure requests
            const token = await getToken();

            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${effectiveLeaseData.leaseId}/document`, {
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
        enabled: !!effectiveLeaseData?.leaseId && effectiveLeaseData.status === 'active',
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

    // Check if lease is approaching expiration (within 30 days)
    const isLeaseExpiringSoon = () => {
        if (!effectiveLeaseData?.expirationDate) return false;
        
        const expirationDate = new Date(effectiveLeaseData.expirationDate);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
    };

    // Effect to update UI state based on query results
    useEffect(() => {
        // Handle error state
        if (isError) {
            setUiState({
                buttonTitle: "Error",
                buttonDisabled: true,
                cardDescription: "An error occurred while fetching lease data.",
                actionIcon: <WarningOutlined className="icon" />,
                showAlert: true,
                alertType: 'error',
                alertMessage: 'Unable to access lease information',
                alertDescription: 'Please contact management for assistance.'
            });
            return;
        }

        // Handle loading state
        if (isLoading || isLoadingSignedLease) {
            setUiState({
                buttonTitle: "Loading...",
                buttonDisabled: true,
                cardDescription: "Checking lease status...",
                actionIcon: <FileTextOutlined className="icon" />,
                showAlert: false,
                alertType: 'info',
                alertMessage: ''
            });
            return;
        }

        // Handle lease data state
        if (effectiveLeaseData) {
            switch (effectiveLeaseData.status) {
                case 'pending_approval':
                    setUiState({
                        buttonTitle: "Sign Lease",
                        buttonDisabled: false,
                        cardDescription: "Your lease requires signing",
                        actionIcon: <WarningOutlined className="icon" />,
                        showAlert: true,
                        alertType: 'warning',
                        alertMessage: 'Your lease is ready to sign',
                        alertDescription: 'Please sign your lease as soon as possible.'
                    });
                    // Show the blocking modal for pending approval status
                    setIsBlockingModalVisible(true);
                    break;
                case 'active':
                    const expiringSoon = isLeaseExpiringSoon();
                    setUiState({
                        buttonTitle: "View Lease",
                        buttonDisabled: false,
                        cardDescription: expiringSoon ? "Your lease is expiring soon" : "Your lease is valid",
                        actionIcon: expiringSoon 
                            ? <ClockCircleOutlined className="icon" />
                            : <CheckCircleOutlined className="icon" />,
                        showAlert: expiringSoon,
                        alertType: expiringSoon ? 'warning' : 'success',
                        alertMessage: expiringSoon 
                            ? 'Your lease is expiring soon' 
                            : 'Your lease is valid and active',
                        alertDescription: expiringSoon 
                            ? 'Please contact management about renewal options.' 
                            : undefined
                    });
                    break;
                case 'terminated':
                    setUiState({
                        buttonTitle: "Terminated",
                        buttonDisabled: true,
                        cardDescription: "Your lease has been terminated",
                        actionIcon: <CloseCircleOutlined className="icon" />,
                        showAlert: true,
                        alertType: 'error',
                        alertMessage: 'Your lease has been terminated',
                        alertDescription: 'Please contact management immediately.'
                    });
                    // Show the blocking modal for terminated status
                    setIsBlockingModalVisible(true);
                    break;
                case 'expired':
                    setUiState({
                        buttonTitle: "Expired",
                        buttonDisabled: true,
                        cardDescription: "Your lease has expired",
                        actionIcon: <CloseCircleOutlined className="icon" />,
                        showAlert: true,
                        alertType: 'error',
                        alertMessage: 'Your lease has expired',
                        alertDescription: 'Please contact management to discuss renewal options.'
                    });
                    // Show the blocking modal for expired status
                    setIsBlockingModalVisible(true);
                    break;
                case 'draft':
                    setUiState({
                        buttonTitle: "Lease Pending",
                        buttonDisabled: true,
                        cardDescription: "Your lease is being prepared",
                        actionIcon: <ClockCircleOutlined className="icon" />,
                        showAlert: true,
                        alertType: 'info',
                        alertMessage: 'Your lease is being prepared',
                        alertDescription: 'You will be notified when it is ready for signing.'
                    });
                    break;
                default:
                    setUiState({
                        buttonTitle: "Contact Management",
                        buttonDisabled: true,
                        cardDescription: "No active lease found",
                        actionIcon: <FileTextOutlined className="icon" />,
                        showAlert: true,
                        alertType: 'warning',
                        alertMessage: 'No active lease found',
                        alertDescription: 'Please contact management for assistance.'
                    });
            }
        }
    }, [effectiveLeaseData, isLoading, isLoadingSignedLease, isError]);

    const handleViewLease = () => {
        // If active lease and we have the Documenso view URL, use that
        if (effectiveLeaseData?.status === 'active' && effectiveLeaseData?.documensoViewUrl) {
            window.open(effectiveLeaseData.documensoViewUrl, '_blank');
            return;
        }
        
        // Otherwise fall back to the previous behavior
        if (effectiveLeaseData?.status === 'active') {
            if (leaseDocument) {
                const objectUrl = URL.createObjectURL(leaseDocument);
                window.open(objectUrl, '_blank');
                URL.revokeObjectURL(objectUrl);
            } else if (signedLeaseData?.lease_pdf_s3) {
                window.open(signedLeaseData.lease_pdf_s3, '_blank');
            }
        } else if (effectiveLeaseData?.url) {
            window.open(effectiveLeaseData.url, '_blank');
        } else {
            setIsLeaseModalVisible(true);
        }
    };

    // Generate appropriate lease status tag
    const getLeaseStatusTag = () => {
        if (!effectiveLeaseData) return null;
        
        switch (effectiveLeaseData.status) {
            case 'active':
                return <Tag color="success">Active</Tag>;
            case 'pending_approval':
                return <Tag color="warning">Pending Signature</Tag>;
            case 'draft':
                return <Tag color="processing">In Preparation</Tag>;
            case 'expired':
                return <Tag color="error">Expired</Tag>;
            case 'terminated':
                return <Tag color="error">Terminated</Tag>;
            default:
                return <Tag>{effectiveLeaseData.status}</Tag>;
        }
    };

    // Handle the sign lease action for the blocking modal
    const handleSignLease = () => {
        if (effectiveLeaseData?.url) {
            window.location.href = effectiveLeaseData.url;
        }
    };

    // Handle contact management action
    const handleContactManagement = () => {
        window.location.href = "mailto:management@curiousdev.net";
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
                        type={effectiveLeaseData?.status === 'pending_approval' ? "danger" : "primary"}
                        onClick={handleViewLease}
                        disabled={uiState.buttonDisabled}
                    />
                }
            />

            {/* Alert component for lease status notifications */}
            {uiState.showAlert && (
                <AlertComponent
                    title=""
                    message={uiState.alertMessage}
                    description={uiState.alertDescription}
                    type={uiState.alertType}
                />
            )}

            {/* Information Modal */}
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
                {isLoading ? (
                    <div className="text-center">
                        <Spin size="large" />
                    </div>
                ) : (
                    <Space direction="vertical" className="w-100">
                        <div className="text-center mb-3">
                            <Text strong>Lease Status:</Text> {getLeaseStatusTag()}
                        </div>
                        
                        {leaseData && leaseData.status === 'active' && (
                            <Paragraph>
                                Your lease is currently active. You can view the signed document using the button below.
                            </Paragraph>
                        )}
                        
                        {leaseData && leaseData.status === 'pending_approval' && (
                            <Paragraph>
                                Your lease requires your signature. Please use the button below to sign your lease.
                            </Paragraph>
                        )}
                        
                        {leaseData && leaseData.status === 'draft' && (
                            <Paragraph>
                                Your lease is currently being prepared by management. You will be notified when it is ready for your signature.
                            </Paragraph>
                        )}
                        
                        {leaseData && (leaseData.status === 'expired' || leaseData.status === 'terminated') && (
                            <Paragraph>
                                Your lease is no longer active. Please contact property management for assistance.
                            </Paragraph>
                        )}
                        
                        {!leaseData && (
                            <Paragraph>
                                No lease information is available at this time. Please contact property management.
                            </Paragraph>
                        )}
                        
                        {leaseData && ['active', 'pending_approval'].includes(leaseData.status) && (
                            <div className="text-center mt-3">
                                <Button 
                                    type="primary" 
                                    onClick={handleViewLease}
                                >
                                    {leaseData.status === 'active' ? 'View Lease Document' : 'Sign Lease Now'}
                                </Button>
                            </div>
                        )}
                    </Space>
                )}
            </Modal>

            {/* Blocking Modal for critical lease statuses */}
            <Modal
                title={
                    effectiveLeaseData?.status === "pending_approval" ? 
                        "Action Required: Lease Signing" : 
                        "Lease Status Alert"
                }
                open={isBlockingModalVisible}
                onCancel={() => {}} // Empty function prevents closing
                maskClosable={false}
                keyboard={false}
                closable={false}
                footer={
                    effectiveLeaseData?.status === "pending_approval" ? [
                        <Button
                            key="submit"
                            type="primary"
                            danger
                            onClick={handleSignLease}
                        >
                            Sign Lease Now
                        </Button>
                    ] : 
                    (effectiveLeaseData?.status === "terminated" || effectiveLeaseData?.status === "expired") ? [
                        <Button
                            key="contact"
                            type="primary"
                            icon={<MailOutlined />}
                            onClick={handleContactManagement}
                        >
                            Contact Management
                        </Button>
                    ] : []
                }
            >
                <Row justify="center" align="middle" className="text-center">
                    <Col span={24}>
                        {effectiveLeaseData?.status === "pending_approval" && (
                            <>
                                <WarningOutlined className="display-1 text-warning mb-3" />
                                <Title level={4}>Your Lease Requires Signing</Title>
                                <Paragraph>
                                    Your lease is ready and waiting for your signature.
                                </Paragraph>
                                <Paragraph>
                                    You must sign your lease to continue using the tenant portal.
                                </Paragraph>
                                <Paragraph className="text-muted fst-italic mt-3">
                                    This action is required and cannot be dismissed.
                                </Paragraph>
                            </>
                        )}
                        
                        {effectiveLeaseData?.status === "terminated" && (
                            <>
                                <CloseCircleOutlined className="display-1 text-danger mb-3" />
                                <Title level={4}>Your Lease Has Been Terminated</Title>
                                <Paragraph>
                                    Your access to the tenant portal is limited because your lease has been terminated.
                                </Paragraph>
                                <Paragraph>
                                    Please contact property management immediately for further information.
                                </Paragraph>
                                <Paragraph className="text-muted fst-italic mt-3">
                                    This message cannot be dismissed.
                                </Paragraph>
                            </>
                        )}
                        
                        {effectiveLeaseData?.status === "expired" && (
                            <>
                                <WarningOutlined className="display-1 text-danger mb-3" />
                                <Title level={4}>Your Lease Has Expired</Title>
                                <Paragraph>
                                    Your access to the tenant portal is limited because your lease has expired.
                                </Paragraph>
                                <Paragraph>
                                    Please contact property management to discuss renewal options.
                                </Paragraph>
                                <Paragraph className="text-muted fst-italic mt-3">
                                    This message cannot be dismissed.
                                </Paragraph>
                            </>
                        )}
                    </Col>
                </Row>
            </Modal>
        </>
    );
};

export default LeaseCard;