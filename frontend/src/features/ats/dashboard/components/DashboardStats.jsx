import {
    FiBriefcase,
    FiUsers,
    FiCalendar,
    FiFileText,
    FiCheckCircle,
    FiXCircle
} from "react-icons/fi";

const stats = [
    {
        title: "Open Jobs",
        value: 12,
        subtitle: "+3 This Week",
        icon: <FiBriefcase />,
        color: "primary"
    },
    {
        title: "Candidates",
        value: 245,
        subtitle: "+18 Today",
        icon: <FiUsers />,
        color: "success"
    },
    {
        title: "Interviews",
        value: 8,
        subtitle: "Today",
        icon: <FiCalendar />,
        color: "warning"
    },
    {
        title: "Offers",
        value: 4,
        subtitle: "Pending",
        icon: <FiFileText />,
        color: "info"
    },
    {
        title: "Hired",
        value: 18,
        subtitle: "This Month",
        icon: <FiCheckCircle />,
        color: "success"
    },
    {
        title: "Rejected",
        value: 35,
        subtitle: "Archived",
        icon: <FiXCircle />,
        color: "danger"
    }
];

export default function DashboardStats() {

    return (

        <div className="row mt-4">

            {
                stats.map((item) => (

                    <div
                        className="col-xl-2 col-lg-4 col-md-6 mb-4"
                        key={item.title}
                    >

                        <div className="card shadow-sm border-0 rounded-4 h-100">

                            <div className="card-body">

                                <div className="d-flex justify-content-between align-items-center">

                                    <div>

                                        <small className="text-muted">
                                            {item.title}
                                        </small>

                                        <h3 className="fw-bold mt-2">
                                            {item.value}
                                        </h3>

                                        <small className={`text-${item.color}`}>
                                            {item.subtitle}
                                        </small>

                                    </div>

                                    <div
                                        className={`bg-${item.color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center`}
                                        style={{
                                            width: 50,
                                            height: 50,
                                            fontSize: 22
                                        }}
                                    >
                                        <span className={`text-${item.color}`}>
                                            {item.icon}
                                        </span>
                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                ))
            }

        </div>

    );

}