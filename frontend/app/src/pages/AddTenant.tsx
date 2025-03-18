import ModalComponent from "../components/ModalComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import TableComponent from "../components/reusableComponents/TableComponent";

// Mock data for tenant table
const columns = [
    {
        title: "Name",
        dataIndex: "name",
        key: "name",
        fixed: "left",
    },
    {
        title: "Email",
        dataIndex: "email",
        key: "email",
    },
    {
        title: "Phone",
        dataIndex: "phone",
        key: "phone",
    },
    {
        title: "Unit Number",
        dataIndex: "unitNumber",
        key: "unitNumber",
    },
    {
        title: "Lease Status",
        dataIndex: "leaseStatus",
        key: "leaseStatus",
    },
    {
        title: "Lease Start",
        dataIndex: "leaseStart",
        key: "leaseStart",
    },
    {
        title: "Lease End",
        dataIndex: "leaseEnd",
        key: "leaseEnd",
    },
    {
        title: "Actions",
        key: "actions",
        fixed: "right",
        render: (text: any, record: any) => (
            <div className="flex flex-column gap-2">
                {/* View Tenant Complaints */}
                <ModalComponent
                    type="View Tenant Complaints"
                    modalTitle="View Tenant Complaints"
                    buttonTitle="View Complaints"
                    content={
                        <div>
                            <div className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                {/* Title */}
                                <p>Complaint 1</p>
                                {/* Status */}
                                <p>
                                    Status: <span style={{ color: "green" }}>Resolved</span>
                                </p>
                            </div>
                            <div className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                {/* Title */}
                                <p>Complaint 2</p>
                                {/* Status */}
                                <p>
                                    Status: <span style={{ color: "red" }}>Pending</span>
                                </p>
                            </div>
                        </div>
                    }
                    handleOkay={() => {}}
                    buttonType="default"
                />
                {/* View Tenant Work Orders */}
                <ModalComponent
                    type="View Tenant Work Orders"
                    modalTitle="View Tenant Work Orders"
                    buttonTitle="View Work Orders"
                    content={
                        <div>
                            <div className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                {/* Title */}
                                <p>Work Order 1</p>
                                {/* Status */}
                                <p>
                                    Status: <span style={{ color: "green" }}>Completed</span>
                                </p>
                                {/* Importance */}
                                <p>
                                    Importance: <span style={{ color: "green" }}>Low</span>
                                </p>
                            </div>
                            <div className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                {/* Title */}
                                <p>Work Order 2</p>
                                {/* Status */}
                                <p>
                                    Status: <span style={{ color: "red" }}>Pending</span>
                                </p>
                                {/* Importance */}
                                <p>
                                    Importance: <span style={{ color: "red" }}>High</span>
                                </p>
                            </div>
                        </div>
                    }
                    handleOkay={() => {}}
                    buttonType="default"
                />
                {/* Leaving these here because I think we might need them. */}
                {/* Edit Tenant */}
                {/* <ModalComponent type="Edit Tenant" modalTitle="Edit Tenant" buttonTitle="Edit" content="Edit Tenant" handleOkay={() => { }} buttonType="primary" /> */}
                {/* Delete Tenant */}
                {/* <ModalComponent type="default" modalTitle="Delete Tenant" buttonTitle="Delete" content="Warning! Are you sure that you would like to delete the tenant?" handleOkay={() => { }} buttonType="danger" /> */}
            </div>
        ),
    },
];

const mockTenants = [
    {
        key: "1",
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "(555) 123-4567",
        unitNumber: "101",
        leaseStatus: <span style={{ color: "green" }}>Active</span>,
        leaseStart: "2023-01-01",
        leaseEnd: "2024-01-01",
    },
    {
        key: "2",
        name: "Jane Smith",
        email: "jane.smith@email.com",
        phone: "(555) 234-5678",
        unitNumber: "202",
        leaseStatus: <span style={{ color: "green" }}>Active</span>,
        leaseStart: "2023-03-15",
        leaseEnd: "2024-03-15",
    },
    {
        key: "3",
        name: "Bob Wilson",
        email: "bob.wilson@email.com",
        phone: "(555) 345-6789",
        unitNumber: "303",
        leaseStatus: <span style={{ color: "red" }}>Expired</span>,
        leaseStart: "2023-06-01",
        leaseEnd: "2024-06-01",
    },
];

const AddTenant = () => {
    return (
        <div className="container">
            {/* <h1 className="p-3">View or Add Tenants</h1> */}
            <PageTitleComponent title="View or Add Tenants" />
            <div className="mb-3 flex">
                <ModalComponent
                    type="Add Tenant"
                    buttonTitle="Add Tenant"
                    content="Add Tenant"
                    buttonType="primary"
                    handleOkay={() => {}}
                />
            </div>
            <TableComponent
                columns={columns}
                dataSource={mockTenants}
                onChange={() => {}}
            />
        </div>
    );
};

export default AddTenant;
