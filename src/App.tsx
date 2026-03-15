import { useState } from 'react'
import type { ViewName } from './lib/types'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useTopics } from './hooks/useTopics'
import { useEpisodes } from './hooks/useEpisodes'
import { useShare } from './hooks/useShare'
import { useGenerate } from './hooks/useGenerate'
import GlowOrbs from './components/layout/GlowOrbs'
import TopBar from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import LoginScreen from './components/views/LoginScreen'
import Dashboard from './components/views/Dashboard'
import Topics from './components/views/Topics'
import Throttles from './components/views/Throttles'
import Voices from './components/views/Voices'
import EpisodePreview from './components/views/EpisodePreview'
import EmailPreview from './components/views/EmailPreview'

export default function App() {
  const [currentView, setCurrentView] = useState<ViewName>('home')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const userId = user?.id ?? null
  const { profile, setTone, setLength, setCadence, setDefaultVoice, setDeliveryTime, setDiscoveryEnabled, setEmailDigest } = useProfile(userId)
  const { topics, addTopic, removeTopic, setWeight, togglePin, setVoiceOverride, addCustomTag, removeCustomTag } = useTopics(userId)
  const { currentEpisode, pastEpisodes } = useEpisodes()
  const { shareToken, copied, listenCount, generateShareLink, getShareUrl, copyShareLink, nativeShare } = useShare()
  const { progress: genProgress, generateEpisode } = useGenerate()

  // Show loading with Audio Pulse animation
  if (authLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <GlowOrbs />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            <span className="text-white">puck</span>
            <span style={{ color: 'var(--accent-pulse)' }}>puck</span>
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
            onNavigate={setCurrentView}
            onDeliveryTimeChange={setDeliveryTime}
            onToggleEmailDigest={setEmailDigest}
            onPreviewEmail={() => setShowEmailPreview(true)}
          />
        )
      case 'topics':
        return (
          <Topics
            topics={topics}
            discoveryEnabled={profile.discovery_enabled}
            defaultVoice={profile.default_voice}
            onAddTopic={addTopic}
            onRemoveTopic={removeTopic}
            onSetWeight={setWeight}
            onTogglePin={togglePin}
            onSetVoiceOverride={setVoiceOverride}
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
            onSetTone={setTone}
            onSetLength={setLength}
            onSetCadence={setCadence}
          />
        )
      case 'voices':
        return (
          <Voices
            defaultVoice={profile.default_voice}
            topics={topics}
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
            onGenerateShare={generateShareLink}
            getShareUrl={getShareUrl}
            onCopy={copyShareLink}
            onShare={nativeShare}
            generationProgress={genProgress}
            onGenerate={() => generateEpisode(currentEpisode.segments)}
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
      <main className="relative z-10 w-full max-w-app mx-auto px-5 pt-[72px] pb-[100px]">
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
