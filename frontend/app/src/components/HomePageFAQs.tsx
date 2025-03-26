import React from "react";
import { Collapse } from "antd";
import { Link } from "react-router";

const { Panel } = Collapse;

interface FAQ {
    question: string;
    answer: string;
}

const faqs: FAQ[] = [
    {
        question: "What is the lease length?",
        answer: "We often reccomend one year, but you can lease for up to 3 years at a time!",
    },
    {
        question: "Do you have mailboxes?",
        answer: "Yes! We implement a smart notification system to let you know when your package arrives!",
    },
    {
        question: "Why EZRA?",
        answer: "Because its so much better than RentDaddy",
    },
];

const HomePageFAQs: React.FC = () => {
    return (
        <div className="my-2">
            <h2>Frequently Asked Questions</h2>
            <Collapse
                accordion
                defaultActiveKey={["0"]}
                className="my-4">
                {faqs.map((faq, index) => (
                    <Panel
                        header={faq.question}
                        key={index}>
                        <p>{faq.answer}</p>
                    </Panel>
                ))}
            </Collapse>
        </div>
    );
};

export default HomePageFAQs;
