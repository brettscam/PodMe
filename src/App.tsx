import { useState, useCallback } from 'react'
import type { ViewName } from './lib/types'
import { useAuth } from './hooks/useAuth'
import { useTopics } from './hooks/useTopics'
import { usePreferences } from './hooks/usePreferences'
import { useEpisodes } from './hooks/useEpisodes'
import LoginScreen from './components/LoginScreen'
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
            <span className="text-white">Pod</span>
            <span className="text-indigo-500">Me</span>
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

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            <span className="text-white">Pod</span>
            <span className="text-indigo-500">Me</span>
          </h1>
        </header>

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
