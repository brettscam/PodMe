import { useState } from 'react'
import type { ViewName } from './lib/types'
import { useProfile } from './hooks/useProfile'
import { useTopics } from './hooks/useTopics'
import { useEpisodes } from './hooks/useEpisodes'
import { useShare } from './hooks/useShare'
import GlowOrbs from './components/layout/GlowOrbs'
import TopBar from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/views/Dashboard'
import Topics from './components/views/Topics'
import Throttles from './components/views/Throttles'
import Voices from './components/views/Voices'
import EpisodePreview from './components/views/EpisodePreview'

export default function App() {
  const [currentView, setCurrentView] = useState<ViewName>('home')
  const { profile, setTone, setLength, setCadence, setDefaultVoice, setDeliveryTime, setDiscoveryEnabled, setEmailDigest } = useProfile()
  const { topics, addTopic, removeTopic, setWeight, togglePin, setVoiceOverride, addCustomTag, removeCustomTag } = useTopics()
  const { currentEpisode, pastEpisodes } = useEpisodes()
  const { shareToken, copied, listenCount, generateShareLink, getShareUrl, copyShareLink, nativeShare } = useShare()

  function renderView() {
    switch (currentView) {
      case 'home':
        return (
          <Dashboard
            profile={profile}
            topics={topics}
            onNavigate={setCurrentView}
            onDeliveryTimeChange={setDeliveryTime}
            onToggleEmailDigest={setEmailDigest}
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
      />
      <main className="relative z-10 w-full max-w-app mx-auto px-5 pt-[72px] pb-[100px]">
        {renderView()}
      </main>
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />
    </div>
  )
}
