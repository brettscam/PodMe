import { useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { ViewName } from './lib/types'
import { useAuth } from './hooks/useAuth'
import { useTopics } from './hooks/useTopics'
import { usePreferences } from './hooks/usePreferences'
import { useEpisodes } from './hooks/useEpisodes'
import { useTier } from './hooks/useTier'
import { useCustomTopics } from './hooks/useCustomTopics'
import { useBilling } from './hooks/useBilling'
import LoginScreen from './components/LoginScreen'
import Onboarding from './components/Onboarding'
import BottomNav from './components/BottomNav'
import TodayView from './components/TodayView'
import LibraryView from './components/LibraryView'
import SettingsView from './components/SettingsView'

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewName>('today')
  const { user, session, loading: authLoading, signInWithGoogle, signOut } = useAuth()

  const {
    topics,
    userTopics,
    loading: topicsLoading,
    toggleTopic,
    updateCustomTags,
    saveUserTopics,
  } = useTopics(session)

  const {
    preferences,
    loading: preferencesLoading,
    error: preferencesError,
    updatePreferences,
  } = usePreferences(session)

  const {
    todayEpisode,
    episodes,
    loadingToday,
    loadingList,
    generating,
    generationStatus,
    generationStageProgress,
    generationError,
    generateNow,
    loadMore,
    hasMore,
    playEpisode,
  } = useEpisodes(session)

  const tierState = useTier(session)
  const customTopicsState = useCustomTopics(session)
  const billingState = useBilling(session)

  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancel' | null>(null)
  const checkoutHandled = useRef(false)

  // Handle returns from Stripe Checkout and the billing portal.
  // The webhook may land after the browser redirect, so poll the tier briefly.
  useEffect(() => {
    if (checkoutHandled.current || !session) return

    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const tab = params.get('tab')
    if (!checkout && !tab) return

    checkoutHandled.current = true

    if (tab === 'settings' || checkout) setActiveTab('settings')
    if (checkout === 'success' || checkout === 'cancel') setCheckoutBanner(checkout)

    window.history.replaceState({}, '', window.location.pathname)

    if (checkout !== 'success') return

    // Webhook race: retry a few times until the tier flips off free.
    let attempts = 0
    const poll = setInterval(() => {
      attempts++
      tierState.refetch()
      if (attempts >= 5) clearInterval(poll)
    }, 2000)
    return () => clearInterval(poll)
  }, [session, tierState])

  const handlePlayEpisode = useCallback(
    (id: string) => {
      playEpisode(id)
      setActiveTab('today')
    },
    [playEpisode]
  )

  // Loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">
            <span className="text-white">Puck</span>
            <span className="text-indigo-500">Puck</span>
          </h1>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user || !session) {
    return <LoginScreen onSignInWithGoogle={signInWithGoogle} />
  }

  // First run. Requires a clean load of both preferences and topics: the
  // defaults carry onboarded_at = null, so showing the wizard on a failed
  // fetch would replay it for established users.
  const needsOnboarding =
    !preferencesLoading &&
    !topicsLoading &&
    !preferencesError &&
    preferences.onboarded_at === null

  if (needsOnboarding) {
    return (
      <Onboarding
        topics={topics}
        userTopics={userTopics}
        preferences={preferences}
        customTopics={customTopicsState}
        tier={tierState}
        onToggleTopic={toggleTopic}
        onSaveTopics={saveUserTopics}
        onUpdatePreferences={updatePreferences}
        onComplete={() => updatePreferences({ onboarded: true })}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            <span className="text-white">Puck</span>
            <span className="text-indigo-500">Puck</span>
          </h1>
        </header>

        {/* Checkout return banner */}
        {checkoutBanner && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 flex items-start gap-3 ${
              checkoutBanner === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            {checkoutBanner === 'success' && (
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">
                {checkoutBanner === 'success'
                  ? 'Subscription active'
                  : 'Checkout canceled'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {checkoutBanner === 'success'
                  ? 'Your new limits are live. It can take a few seconds to show up here.'
                  : 'No charge was made. You can upgrade any time from Plan.'}
              </p>
            </div>
            <button
              onClick={() => setCheckoutBanner(null)}
              className="text-gray-500 hover:text-white flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'today' && (
          <TodayView
            todayEpisode={todayEpisode}
            loading={loadingToday}
            generating={generating}
            generationStatus={generationStatus}
            generationStageProgress={generationStageProgress}
            generationError={generationError}
            onGenerate={generateNow}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            episodes={episodes}
            loading={loadingList}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onPlayEpisode={handlePlayEpisode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            session={session}
            topics={topics}
            userTopics={userTopics}
            preferences={preferences}
            preferencesLoading={preferencesLoading}
            topicsLoading={topicsLoading}
            tier={tierState}
            customTopics={customTopicsState}
            billing={billingState}
            onToggleTopic={toggleTopic}
            onUpdateCustomTags={updateCustomTags}
            onSaveTopics={saveUserTopics}
            onUpdatePreferences={updatePreferences}
            onGenerate={generateNow}
            generating={generating}
            onSignOut={signOut}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
