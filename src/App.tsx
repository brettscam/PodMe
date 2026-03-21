import { useState, useCallback } from 'react'
import type { ViewName, LifeContext } from './lib/types'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useTopics } from './hooks/useTopics'
import { useEpisodeBuilder } from './hooks/useEpisodeBuilder'
import { useShare } from './hooks/useShare'
import { useGenerate } from './hooks/useGenerate'
import GlowOrbs from './components/layout/GlowOrbs'
import TopBar from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import LoginScreen from './components/views/LoginScreen'
import Dashboard from './components/views/Dashboard'
import Topics from './components/views/Topics'
import Throttles from './components/views/Throttles'
import EpisodePreview from './components/views/EpisodePreview'
import EmailPreview from './components/views/EmailPreview'
import Profile from './components/views/Profile'

const DEFAULT_LIFE_CONTEXTS: LifeContext[] = [
  { id: 'parenting', type: 'parenting', label: 'Parenting', enabled: false, config: {} },
  { id: 'fitness', type: 'fitness', label: 'Fitness', enabled: false, config: {} },
  { id: 'learning', type: 'learning', label: 'Learning', enabled: false, config: {} },
  { id: 'home', type: 'home', label: 'Home', enabled: false, config: {} },
  { id: 'career', type: 'career', label: 'Career', enabled: false, config: {} },
]

export default function App() {
  const [currentView, setCurrentView] = useState<ViewName>('home')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [lifeContexts, setLifeContexts] = useState<LifeContext[]>(DEFAULT_LIFE_CONTEXTS)
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const userId = user?.id ?? null
  const { profile, setTone, setLength, setCadence, setDefaultVoice, setDeliveryTime, setDiscoveryEnabled, setEmailDigest } = useProfile(userId)
  const { topics, addTopic, removeTopic, setWeight, togglePin, addCustomTag, removeCustomTag } = useTopics(userId)
  const { currentEpisode, pastEpisodes, loading: episodeLoading, error: episodeError, refresh: refreshEpisode } = useEpisodeBuilder(topics, profile.tone, profile.length, profile.default_voice, user?.id)
  const { shareToken, copied, listenCount, generateShareLink, getShareUrl, copyShareLink, nativeShare } = useShare()
  const { progress: genProgress, generateEpisode, reset: resetGeneration } = useGenerate()

  const handleRegenerate = useCallback(() => {
    resetGeneration()
    if (currentEpisode) {
      generateEpisode(currentEpisode.segments)
    } else {
      refreshEpisode()
    }
  }, [resetGeneration, generateEpisode, currentEpisode, refreshEpisode])

  const toggleLifeContext = useCallback((id: string, enabled: boolean) => {
    setLifeContexts(prev => prev.map(c => c.type === id ? { ...c, enabled } : c))
  }, [])

  const updateLifeContextConfig = useCallback((id: string, config: Record<string, string>) => {
    setLifeContexts(prev => prev.map(c => c.type === id ? { ...c, config } : c))
  }, [])

  // Show loading with Audio Pulse animation
  if (authLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <GlowOrbs />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            <span className="text-white">Pod</span>
            <span style={{ color: 'var(--accent-pulse)' }}>Me</span>
          </h1>
          <div className="flex items-end justify-center gap-1 h-8">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="wave-bar" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onSignInWithGoogle={signInWithGoogle} />
  }

  function renderView() {
    switch (currentView) {
      case 'home':
        return (
          <Dashboard
            profile={profile}
            topics={topics}
            episode={currentEpisode}
            generatedAudioUrls={genProgress.status === 'complete' ? genProgress.audioUrls : undefined}
            generationStatus={genProgress.status}
            generationError={genProgress.error}
            onNavigate={setCurrentView}
            onDeliveryTimeChange={setDeliveryTime}
            onToggleEmailDigest={setEmailDigest}
            onPreviewEmail={() => setShowEmailPreview(true)}
            episodeLoading={episodeLoading}
            episodeError={episodeError}
            onGenerate={() => currentEpisode ? generateEpisode(currentEpisode.segments) : refreshEpisode()}
            onRegenerate={handleRegenerate}
          />
        )
      case 'topics':
        return (
          <Topics
            topics={topics}
            discoveryEnabled={profile.discovery_enabled}
            onAddTopic={addTopic}
            onRemoveTopic={removeTopic}
            onSetWeight={setWeight}
            onTogglePin={togglePin}
            onToggleDiscovery={setDiscoveryEnabled}
            onAddCustomTag={addCustomTag}
            onRemoveCustomTag={removeCustomTag}
          />
        )
      case 'throttles':
        return (
          <Throttles
            tone={profile.tone}
            length={profile.length}
            cadence={profile.cadence}
            defaultVoice={profile.default_voice}
            onSetTone={setTone}
            onSetLength={setLength}
            onSetCadence={setCadence}
            onSetDefaultVoice={setDefaultVoice}
          />
        )
      case 'episode':
        return (
          <EpisodePreview
            episode={currentEpisode}
            pastEpisodes={pastEpisodes}
            shareToken={shareToken}
            copied={copied}
            listenCount={listenCount}
            onGenerateShare={() => currentEpisode?.id ? generateShareLink(currentEpisode.id, user?.user_metadata?.full_name) : undefined}
            getShareUrl={getShareUrl}
            onCopy={copyShareLink}
            onShare={nativeShare}
            generationProgress={genProgress}
            generatedAudioUrls={genProgress.status === 'complete' ? genProgress.audioUrls : undefined}
            onGenerate={() => currentEpisode ? generateEpisode(currentEpisode.segments) : refreshEpisode()}
            onRegenerate={handleRegenerate}
          />
        )
      case 'profile':
        return (
          <Profile
            profile={profile}
            userName={user?.user_metadata?.full_name || user?.email || undefined}
            lifeContexts={lifeContexts}
            onSetTone={setTone}
            onSetLength={setLength}
            onSetCadence={setCadence}
            onDeliveryTimeChange={setDeliveryTime}
            onToggleEmailDigest={setEmailDigest}
            onPreviewEmail={() => setShowEmailPreview(true)}
            onToggleLifeContext={toggleLifeContext}
            onUpdateLifeContextConfig={updateLifeContextConfig}
            onNavigate={setCurrentView}
            onSignOut={signOut}
          />
        )
    }
  }

  return (
    <div className="relative min-h-screen">
      <GlowOrbs />
      <TopBar
        currentView={currentView}
        onBack={currentView !== 'home' ? () => setCurrentView('home') : undefined}
        userName={user.user_metadata?.full_name || user.email || undefined}
        onSignOut={signOut}
      />
      <main className="relative z-10 w-full max-w-app mx-auto px-5 pt-[72px]" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
        {renderView()}
      </main>
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />

      {/* Email Digest Preview Modal */}
      {showEmailPreview && (
        <EmailPreview onClose={() => setShowEmailPreview(false)} />
      )}
    </div>
  )
}
