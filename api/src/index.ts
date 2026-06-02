// Health check
import './functions/health'

// Auth
import './functions/auth/login'
import './functions/auth/verify2fa'
import './functions/auth/refresh'
import './functions/auth/me'
import './functions/auth/logout'
import './functions/auth/setupTotp'
import './functions/auth/debugToken'

// Projects
import './functions/projects/list'
import './functions/projects/get'
import './functions/projects/createProject'
import './functions/projects/updateProject'
import './functions/projects/deleteProject'
import './functions/projects/getRecommendations'
import './functions/projects/auditLog'

// Entreprises
import './functions/entreprises/listEntreprises'
import './functions/entreprises/updateEntrepriseRelevance'
import './functions/entreprises/updateEntrepriseStatus'

// Bids
import './functions/bids/listBids'
import './functions/bids/listInvitations'
import './functions/bids/inviteContractor'
import './functions/bids/cancelInvitation'
import './functions/bids/selectBid'
import './functions/bids/overview'

// Approvals
import './functions/approvals/listPending'
import './functions/approvals/approveStatusUpdate'
import './functions/approvals/rejectStatusUpdate'
import './functions/approvals/approveFinalReport'
import './functions/approvals/rejectFinalReport'

// Contractors
import './functions/contractors/list'
import './functions/contractors/getContractor'
import './functions/contractors/createContractor'
import './functions/contractors/updateContractor'

// Chat
import './functions/chat/listChannels'
import './functions/chat/listProjectChannels'
import './functions/chat/createChannel'
import './functions/chat/getMessages'
import './functions/chat/sendMessage'

// Files
import './functions/files/listFiles'
import './functions/files/uploadFile'
import './functions/files/getSignedUrl'

// Dashboards
import './functions/sedgwick/dashboard'
import './functions/insurer/dashboard'

// Users, Insurers & Skills
import './functions/users/listUsers'
import './functions/users/manageUser'
import './functions/insurers/list'
import './functions/insurers/manage'
import './functions/skills/listSkills'

// Notifications
import './functions/notifications/preferences'
import './functions/notifications/listNotifications'
import './functions/notifications/getUnreadCount'
import './functions/notifications/markRead'
import './functions/notifications/markAllRead'

// Contractor portal
import './functions/contractor/dashboard'
import './functions/contractor/getMyInvitations'
import './functions/contractor/respondToInvitation'
import './functions/contractor/submitBid'
import './functions/contractor/getMyBid'
import './functions/contractor/getMyJobs'
import './functions/contractor/getEntrepriseDetail'
import './functions/contractor/submitStatusUpdate'
import './functions/contractor/submitFinalReport'
import './functions/contractor/getMyProfile'

// Public API
import './functions/public/createProjectPublic'
import './functions/public/listProjectsPublic'
import './functions/public/getProjectPublic'
import './functions/public/ingest'
