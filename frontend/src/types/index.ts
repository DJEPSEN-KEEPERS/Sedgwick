// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'SEDGWICK_ADMIN' | 'INSURER_USER' | 'CONTRACTOR_USER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type TwoFactorMethod = 'TOTP' | 'SMS'

export type PriorityLevel = 'NORMAL' | 'FASTTRACK'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED'
export type ProjectMilestone =
  | 'CASE_RECEIVED'
  | 'BIDDING_IN_PROGRESS'
  | 'CONTRACTOR_SELECTED'
  | 'WORK_SCHEDULED'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'FINAL_REPORT_SUBMITTED'
  | 'CASE_INVOICED'
  | 'CASE_CLOSED'

export type EntrepriseType =
  | 'CARPENTER'
  | 'MASON'
  | 'PLUMBER'
  | 'GLAZIER'
  | 'ELECTRICIAN'
  | 'PAINTER'
  | 'ROOFER'
  | 'OTHER'

export type EntrepriseMilestone =
  | 'NOT_STARTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SIGNED_OFF'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type InvitationStatus = 'PENDING' | 'INTERESTED' | 'NOT_INTERESTED'
export type ChannelType = 'SEDGWICK_CONTRACTOR' | 'SEDGWICK_INSURER' | 'SEDGWICK_BIDDER'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  linkedEntityId: string | null
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  phone?: string
  twoFactorEnabled: boolean
  twoFactorMethod: TwoFactorMethod
  linkedEntityId: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  requiresTwoFactor: boolean
  tempToken?: string
  message: string
}

export interface TwoFactorRequest {
  tempToken: string
  code: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  phone?: string
  fullName: string
  role: UserRole
  status: UserStatus
  twoFactorEnabled: boolean
  twoFactorMethod: TwoFactorMethod
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Insurance Companies ──────────────────────────────────────────────────────

export interface InsuranceCompany {
  id: string
  name: string
  externalReference?: string
  status: string
  createdAt: string
  updatedAt: string
}

// ─── Contractors ──────────────────────────────────────────────────────────────

export interface Contractor {
  id: string
  companyName: string
  cvrNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  description?: string
  maxParallelProjects: number
  currentWorkload: number
  status: string
  sedgwickRatingAvg: number
  clientRatingAvg: number
  regions: string[]
  skills: Skill[]
  certifications: ContractorCertification[]
  createdAt: string
  updatedAt: string
}

export interface Skill {
  id: string
  name: string
  category: string
}

export interface ContractorCertification {
  id: string
  name: string
  issuer?: string
  validUntil?: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ResponsibleUser {
  id: string
  fullName: string
  email: string
}

export interface Project {
  id: string
  claimId: string
  insurerCaseId: string
  insurancePolicyNumber: string
  insuranceCompanyId: string
  insuranceCompany?: InsuranceCompany
  responsibleUserId?: string | null
  responsibleUser?: ResponsibleUser | null
  damageType: string
  damageDescription: string
  priorityLevel: PriorityLevel
  buildingType: string
  address: string
  postalCode: string
  city: string
  region: string
  gpsLat?: number
  gpsLng?: number
  maxApprovedPrice?: number
  estimatedScope?: string
  requestedStartDate?: string
  requestedDeadline?: string
  slaCategory?: string
  contactName: string
  contactPhone: string
  contactEmail: string
  currentMilestone: ProjectMilestone
  progressPercent: number
  selectedContractorId?: string
  selectedContractor?: Contractor
  status: ProjectStatus
  finalCompletionDate?: string
  entreprises: Entreprise[]
  createdAt: string
  updatedAt: string
}

// ─── Entreprises ──────────────────────────────────────────────────────────────

export interface Entreprise {
  id: string
  projectId: string
  contractorId?: string
  contractor?: Contractor
  type: EntrepriseType
  description?: string
  isRelevant: boolean
  markedRelevantBy?: string
  currentMilestone: EntrepriseMilestone
  progressPercent: number
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  createdAt: string
  updatedAt: string
}

// ─── Bids ─────────────────────────────────────────────────────────────────────

export interface BidInvitation {
  id: string
  projectId: string
  contractorId: string
  contractor?: Contractor
  status: InvitationStatus
  invitedAt: string
  respondedAt?: string
  bid?: Bid
}

export interface Bid {
  id: string
  projectId: string
  contractorId: string
  contractor?: Contractor
  bidAmount: number
  currency: string
  comments?: string
  submittedAt: string
  isSelected: boolean
  selectedAt?: string
  attachments: BidAttachment[]
}

export interface BidAttachment {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSizeMb: number
}

// ─── Status Updates ───────────────────────────────────────────────────────────

export interface EntrepriseStatusUpdate {
  id: string
  entrepriseId: string
  submittedByUserId: string
  milestone: EntrepriseMilestone
  progressPercent: number
  startedFlag: boolean
  completedFlag: boolean
  expectedCompletion?: string
  comments?: string
  approvalStatus: ApprovalStatus
  approvedByUserId?: string
  approvedAt?: string
  createdAt: string
  attachments: StatusUpdateAttachment[]
}

export interface StatusUpdateAttachment {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSizeMb: number
}

// ─── Final Reports ────────────────────────────────────────────────────────────

export interface FinalReport {
  id: string
  entrepriseId: string
  contractorId: string
  summary?: string
  submittedAt?: string
  approvalStatus: ApprovalStatus
  approvedAt?: string
  answers: FinalReportAnswer[]
  attachments: FinalReportAttachment[]
  createdAt: string
}

export interface FinalReportAnswer {
  id: string
  questionKey: string
  questionLabel: string
  answerValue: string
}

export interface FinalReportAttachment {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSizeMb: number
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatChannel {
  id: string
  projectId: string
  channelType: ChannelType
  name: string
  createdAt: string
  participants: ChatParticipant[]
  messages?: ChatMessage[]
}

export interface ChatParticipant {
  id: string
  userId: string
  user?: User
}

export interface ChatMessage {
  id: string
  channelId: string
  senderUserId: string
  sender?: User
  messageBody: string
  messageType: string
  createdAt: string
  attachments: ChatMessageAttachment[]
}

export interface ChatMessageAttachment {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSizeMb: number
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  eventType: string
  channel: string
  title: string
  message: string
  status: string
  sentAt?: string
  createdAt: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
