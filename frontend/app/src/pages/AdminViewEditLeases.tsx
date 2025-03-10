import "../styles/styles.scss";
import {
    ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
    Avatar,
    Button,
    Card,
    Col,
    ConfigProvider,
    Divider,
    Input,
    Row,
} from "antd"
import AntDesignTableComponent from "../components/AntDesignTableComponent"

export default function AdminViewEditLeases() {


    return (
        <div>
            <h1>Admin View & Edit Leases</h1>
            <div className="table m-5">
                <h2>Table</h2>
                <AntDesignTableComponent />
            </div>
        </div>
    );
}