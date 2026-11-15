// File purpose: Shows one food complaint as a short conversation: what the customer reported, the restaurant's answer
// and HUB's decision. Used on the customer's order page, in the Restaurant Center and in the admin area.
import { complaintStatusLabel, complaintTopicLabel, dateTime } from './foodApi'
import type { FoodComplaint } from './foodApi'

type Props = { complaint: FoodComplaint; viewer: 'customer' | 'restaurant' | 'admin' }

export function ComplaintThread({ complaint, viewer }: Props) {
  const from = viewer === 'customer' ? 'You' : complaint.customerName ?? 'Customer'
  const restaurant = viewer === 'restaurant' ? 'Your answer' : complaint.restaurantName
  return (
    <div className="fd-complaint">
      <div className="fd-card-top">
        <strong>{complaintTopicLabel[complaint.topic]}</strong>
        <span className={`fd-status fd-status-${complaint.status.toLowerCase()}`}>{complaintStatusLabel[complaint.status]}</span>
      </div>
      <ol className="fd-thread">
        <li className="fd-bubble customer">
          <span className="fd-bubble-who">{from} · {dateTime(complaint.createdAt)}</span>
          <p>{complaint.details}</p>
        </li>
        {complaint.restaurantReply ? (
          <li className="fd-bubble restaurant">
            <span className="fd-bubble-who">{restaurant} · {dateTime(complaint.repliedAt)}</span>
            <p>{complaint.restaurantReply}</p>
          </li>
        ) : complaint.status === 'Open' && (
          <li className="fd-bubble waiting">
            <p>{viewer === 'restaurant' ? 'You have not answered yet.' : 'The restaurant has not answered yet.'}</p>
          </li>
        )}
        {complaint.adminNote && (
          <li className="fd-bubble hub">
            <span className="fd-bubble-who">HUB · {complaint.status === 'Resolved' ? 'resolved' : 'dismissed'} {dateTime(complaint.closedAt)}</span>
            <p>{complaint.adminNote}</p>
          </li>
        )}
      </ol>
      {complaint.status === 'Open' && viewer === 'customer' && (
        <p className="fd-meta">HUB will look at your report and decide. You will get a notification.</p>
      )}
    </div>
  )
}
