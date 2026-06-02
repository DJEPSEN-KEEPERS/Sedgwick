import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore } from '@/stores/authStore'

import SedgwickLoginPage from '@/pages/auth/SedgwickLoginPage'
import InsurerLoginPage from '@/pages/auth/InsurerLoginPage'
import ContractorLoginPage from '@/pages/auth/ContractorLoginPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import UnauthorizedPage from '@/pages/UnauthorizedPage'

import RoleGuard from '@/components/auth/RoleGuard'
import AuthGuard from '@/components/auth/AuthGuard'

import SedgwickLayout from '@/components/layout/SedgwickLayout'
import InsurerLayout from '@/components/layout/InsurerLayout'
import ContractorLayout from '@/components/layout/ContractorLayout'

// ─── Sedgwick pages ────────────────────────────────────────────────────────────
const SedgwickDashboard       = lazy(() => import('@/pages/sedgwick/DashboardPage'))
const SedgwickProjectsPage    = lazy(() => import('@/pages/sedgwick/ProjectsPage'))
const SedgwickProjectDetail   = lazy(() => import('@/pages/sedgwick/ProjectDetailPage'))
const SedgwickContractorsPage = lazy(() => import('@/pages/sedgwick/ContractorsPage'))
const SedgwickContractorDetail= lazy(() => import('@/pages/sedgwick/ContractorDetailPage'))
const SedgwickBidsPage        = lazy(() => import('@/pages/sedgwick/BidsPage'))
const SedgwickApprovalsPage   = lazy(() => import('@/pages/sedgwick/ApprovalsPage'))
const SedgwickMessagesPage    = lazy(() => import('@/pages/sedgwick/MessagesPage'))
const SedgwickSettingsPage    = lazy(() => import('@/pages/sedgwick/SettingsPage'))

// ─── Insurer pages ─────────────────────────────────────────────────────────────
const InsurerDashboard      = lazy(() => import('@/pages/insurer/DashboardPage'))
const InsurerProjectsPage   = lazy(() => import('@/pages/insurer/ProjectsPage'))
const InsurerProjectDetail  = lazy(() => import('@/pages/insurer/ProjectDetailPage'))

// ─── Contractor pages ──────────────────────────────────────────────────────────
const ContractorDashboard        = lazy(() => import('@/pages/contractor/DashboardPage'))
const ContractorProjectsPage     = lazy(() => import('@/pages/contractor/ProjectsPage'))
const ContractorInvitationsPage  = lazy(() => import('@/pages/contractor/InvitationsPage'))
const ContractorBidSubmitPage    = lazy(() => import('@/pages/contractor/BidSubmitPage'))
const ContractorJobsPage         = lazy(() => import('@/pages/contractor/JobsPage'))
const ContractorJobDetailPage    = lazy(() => import('@/pages/contractor/JobDetailPage'))
const ContractorStatusUpdatePage = lazy(() => import('@/pages/contractor/StatusUpdatePage'))
const ContractorFinalReportPage  = lazy(() => import('@/pages/contractor/FinalReportPage'))
const ContractorProfilePage      = lazy(() => import('@/pages/contractor/ProfilePage'))
const ContractorChatPage         = lazy(() => import('@/pages/contractor/ChatPage'))

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
  </div>
)

export default function App() {
  const { isAuthenticated, fetchMe, accessToken } = useAuthStore()

  useEffect(() => {
    if (accessToken && !isAuthenticated) fetchMe()
  }, [accessToken, isAuthenticated, fetchMe])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Navigate to="/login/sedgwick" replace />} />
        <Route path="/login/sedgwick"   element={<SedgwickLoginPage />} />
        <Route path="/login/insurer"    element={<InsurerLoginPage />} />
        <Route path="/login/contractor" element={<ContractorLoginPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        <Route path="/unauthorized"     element={<UnauthorizedPage />} />

        {/* Sedgwick portal */}
        <Route
          path="/sedgwick"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SEDGWICK_ADMIN']}>
                <SedgwickLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/sedgwick/dashboard" replace />} />
          <Route path="dashboard"                    element={<SedgwickDashboard />} />
          <Route path="projects"                     element={<SedgwickProjectsPage />} />
          <Route path="projects/:projectId"          element={<SedgwickProjectDetail />} />
          <Route path="contractors"                  element={<SedgwickContractorsPage />} />
          <Route path="contractors/:contractorId"    element={<SedgwickContractorDetail />} />
          <Route path="bids"                         element={<SedgwickBidsPage />} />
          <Route path="approvals"                    element={<SedgwickApprovalsPage />} />
          <Route path="messages"                     element={<SedgwickMessagesPage />} />
          <Route path="settings"                     element={<SedgwickSettingsPage />} />
        </Route>

        {/* Insurer portal */}
        <Route
          path="/insurer"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['INSURER_USER']}>
                <InsurerLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/insurer/dashboard" replace />} />
          <Route path="dashboard"           element={<InsurerDashboard />} />
          <Route path="projects"            element={<InsurerProjectsPage />} />
          <Route path="projects/:projectId" element={<InsurerProjectDetail />} />
        </Route>

        {/* Contractor portal */}
        <Route
          path="/contractor"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['CONTRACTOR_USER']}>
                <ContractorLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/contractor/dashboard" replace />} />
          <Route path="dashboard"                       element={<ContractorDashboard />} />
          <Route path="projects"                        element={<ContractorProjectsPage />} />
          <Route path="invitations"                     element={<ContractorInvitationsPage />} />
          <Route path="bids/submit/:projectId"          element={<ContractorBidSubmitPage />} />
          <Route path="jobs"                            element={<ContractorJobsPage />} />
          <Route path="jobs/:projectId"                 element={<ContractorJobDetailPage />} />
          <Route path="status-update/:entrepriseId"     element={<ContractorStatusUpdatePage />} />
          <Route path="final-report/:entrepriseId"      element={<ContractorFinalReportPage />} />
          <Route path="profile"                         element={<ContractorProfilePage />} />
          <Route path="chat"                            element={<ContractorChatPage />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login/sedgwick" replace />
  if (user?.role === 'SEDGWICK_ADMIN')   return <Navigate to="/sedgwick/dashboard" replace />
  if (user?.role === 'INSURER_USER')     return <Navigate to="/insurer/dashboard" replace />
  if (user?.role === 'CONTRACTOR_USER')  return <Navigate to="/contractor/dashboard" replace />
  return <Navigate to="/login/sedgwick" replace />
}
