#!/usr/bin/env python3
"""
MyPod Episode Generator — Tuesday, March 14, 2026
Generates a full podcast episode with ElevenLabs TTS and stitches with ffmpeg.

Usage:
    pip install elevenlabs
    python scripts/generate_episode.py

Output:
    public/episodes/2026-03-14.mp3
"""

import os
import sys
import time
import subprocess
from pathlib import Path

try:
    from elevenlabs import ElevenLabs
except ImportError:
    print("Installing elevenlabs SDK...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "elevenlabs"])
    from elevenlabs import ElevenLabs

# ─── Configuration ───────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY",
    "sk_85fb0f5a3e4c236af044a42eb34bee6c99b2c68160889be3"
)

# Map MyPod voice IDs to ElevenLabs voice IDs
# Using ElevenLabs' pre-made voices that match our personas
VOICE_MAP = {
    "anchor":        "pNInz6obpgDQGcFmaJgB",   # Adam — warm, authoritative (NPR-adjacent)
    "strategist":    "ErXwobaYiN019PkySvjV",   # Antoni — calm, analytical (hedge fund tone)
    "neighbor":      "VR6AewLTigWG4xSOukaG",   # Arnold — casual, conversational
    "correspondent": "EXAVITQu4vr4xnSDxMaL",   # Bella — crisp, energetic
    "analyst":       "21m00Tcm4TlvDq8ikWAM",   # Rachel — measured, Bloomberg tone
    "host":          "AZnzlk1XvdvUeBnXmlld",   # Domi — big personality
}

# ElevenLabs model — use multilingual v2 for best quality
MODEL_ID = "eleven_multilingual_v2"

# Output paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "episodes"
TEMP_DIR = SCRIPT_DIR / "temp_segments"

# ─── Episode Script ──────────────────────────────────────────────────────────
# Full, realistic podcast scripts for Tuesday, March 14, 2026

SEGMENTS = [
    {
        "id": "00_cold_open",
        "voice": "anchor",
        "title": "Cold Open",
        "script": """Good morning. It's Tuesday, March fourteenth, twenty twenty-six. I'm your anchor, and this is MyPod.

Big earnings week ahead. NVIDIA reports tomorrow after the bell, and analysts are calling it the most important tech print of the quarter. Apple just wrapped a surprise spring event with some major hardware announcements. On the world stage, ceasefire talks between Ukraine and Russia are back on in Geneva with a new framework on the table. And closer to home, Marin County supervisors vote tonight on a housing element that's been months in the making.

It's a packed morning. Let's get into it."""
    },
    {
        "id": "01_earnings",
        "voice": "strategist",
        "title": "Markets & Earnings",
        "script": """Let's talk markets. The S&P closed Monday at fifty-three twelve, up six tenths of a percent, largely on positioning ahead of NVIDIA's print tomorrow.

NVIDIA is the main event this week. The street is looking for data center revenue of twenty point two billion, which would be another record. But the real signal isn't the top line — it's the inference-to-training revenue ratio. Last quarter, Jensen Huang said inference workloads were approaching fifty percent of data center compute. If that crosses the threshold tomorrow, it fundamentally changes the NVIDIA thesis from a capex cyclical play to an annuity-style recurring revenue story. That's a different multiple entirely.

The other number to watch is Blackwell chip shipment guidance. Analysts at Morgan Stanley flagged that Blackwell B200 GPUs are shipping ahead of schedule, with hyperscaler customers — Amazon, Google, Microsoft — pulling forward orders into Q2. If NVIDIA confirms accelerated Blackwell shipments, expect the stock to gap up. Current consensus is around nine hundred fifty dollars. My read? The whisper number is closer to a thousand.

Beyond NVIDIA, Adobe reports Thursday. The street wants to hear about Firefly AI integration driving creative cloud retention. And Oracle's earnings Monday showed cloud infrastructure revenue jumping forty-six percent year-over-year, which sets a bullish tone for the broader cloud infrastructure trade.

One more thing. Fed funds futures are now pricing in a seventy-two percent probability of a June rate cut, up from sixty-one percent last week, after Friday's jobs report showed unemployment ticking up to four point one percent. Markets like the idea of rate relief. The two-year treasury yield dropped below four percent for the first time since November."""
    },
    {
        "id": "02_tech",
        "voice": "anchor",
        "title": "Technology",
        "script": """In tech news, Apple held an unannounced spring event yesterday, and there's a lot to unpack.

The headline is the new iPad Pro with the M4 Ultra chip — Apple's most powerful silicon yet, with a forty-core GPU. Apple is clearly positioning the iPad Pro as a legitimate creative workstation. They also announced a new external display, the Apple Studio Display Pro, with a mini-LED panel that does ProMotion at one-twenty hertz.

But the real surprise was Apple Glass. Tim Cook showed a brief demo of lightweight AR glasses that pair with your iPhone. They're sleek — think regular prescription frames with a subtle heads-up display. Ship date is June. No pricing yet, but analysts are estimating fourteen hundred to two thousand dollars. If Apple can nail the form factor where Meta and Google struggled, this could be the device that finally makes AR mainstream.

In AI news, Anthropic released Claude four point five Opus last week, and early benchmarks are showing significant improvements in coding and reasoning tasks. The model scored ninety-two percent on the SWE-bench full benchmark, which is a new high-water mark. Developers are reporting that it can handle multi-file refactoring tasks that previous models struggled with.

And a quick note — the EU's AI Act enforcement officially begins this week. Companies operating in Europe now have disclosure requirements for high-risk AI systems, including foundation models. The big question is how aggressively regulators will enforce, and whether this creates a competitive moat for EU-based AI companies or just adds compliance costs across the board."""
    },
    {
        "id": "03_world",
        "voice": "anchor",
        "title": "World News",
        "script": """Turning to world news. Ceasefire talks between Ukraine and Russia resumed in Geneva yesterday, and there's cautious optimism for the first time in months.

The key development is a new framework proposed by Turkish and Brazilian mediators that separates the territorial question from the security guarantee question. Instead of trying to solve everything at once, the proposal sequences negotiations — starting with a sixty-day ceasefire and prisoner exchange, followed by talks on a demilitarized buffer zone, with the hardest territorial questions pushed to a separate track. Ukrainian President Zelensky called it "imperfect but serious." The Kremlin's response was measured but didn't reject it outright, which diplomats are reading as a positive signal. The next round of talks is scheduled for March twenty-eighth.

In Asia, China announced a five hundred billion dollar economic stimulus package focused on domestic consumption. The package includes direct cash transfers to lower-income households, subsidies for electric vehicle purchases, and a major infrastructure push targeting rural broadband and high-speed rail. Economists at Goldman Sachs upgraded China's twenty twenty-six GDP growth forecast from four point two to four point eight percent on the news. The stimulus is widely seen as Beijing's response to slowing export growth amid ongoing trade tensions with the US and EU.

One more international story. India's space agency, ISRO, successfully tested its reusable launch vehicle over the weekend. The Pushpak vehicle completed an autonomous landing after reaching an altitude of seventy kilometers. India is now the third country after the US and China to demonstrate reusable rocket technology, and they did it at a fraction of the cost."""
    },
    {
        "id": "04_bay_area",
        "voice": "anchor",
        "title": "Bay Area News",
        "script": """In Bay Area news, the BART Silicon Valley extension timeline has been pushed back again, this time to twenty twenty-eight.

The six-mile extension from Berryessa to downtown San Jose was originally supposed to open in twenty twenty-six, but the project has been plagued by cost overruns and construction delays. The latest issue is geological — tunneling crews hit unexpected groundwater conditions near the Diridon Station site that require additional engineering work. The total project cost has ballooned from six point nine billion to an estimated eight point two billion. VTA says they're exploring federal infrastructure funding to cover the gap, but Bay Area transit advocates are frustrated.

On a brighter note, San Francisco office vacancy rates actually declined for the first time in four years, dropping from thirty-four percent to thirty-one point eight percent. The biggest driver? AI companies. Anthropic, OpenAI, and several mid-stage AI startups have been snapping up office space in SoMa and the Financial District. The AI boom is doing for San Francisco in twenty twenty-six what the dot-com boom did in the late nineties — putting bodies back in buildings and energy back on the streets."""
    },
    {
        "id": "05_marin",
        "voice": "neighbor",
        "title": "Marin Local",
        "script": """Alright, let's talk about what's happening right here in Marin.

Tonight is a big one. The Marin County Board of Supervisors votes on the updated Housing Element at their six PM meeting. This has been months in the making. The state requires Marin to plan for nearly thirty-five hundred new housing units over the next eight years, and the draft plan identifies sites in unincorporated areas near Tam Junction, Strawberry, and Marin City for higher-density development. Expect a packed house at the Civic Center tonight. If you want to attend, public comment starts at six-thirty. If you can't make it in person, the meeting will be livestreamed on the county website.

Some good news for the weekend crowd. The San Rafael farmer's market at the Civic Center is going year-round starting this week. Previously it shut down from December through mid-March, but strong vendor demand and community petitions convinced the organizers to keep it running through the winter months. Sundays, eight AM to one PM. The first spring market this Sunday will feature a local honey tasting from Marin Bee Company and live acoustic music.

And for the hikers in the audience — there's a new trail opening on Mount Tamalpais this Saturday. The Marin Municipal Water District finished work on the Azalea Hill Loop, a two point three mile moderate trail that connects to the Cataract Trail system. The dedication ceremony is Saturday at ten AM at the Rock Spring trailhead. It's the first new trail on Tam in over a decade, and it opens up some beautiful old-growth redwood groves that were previously only accessible by fire roads."""
    },
    {
        "id": "06_photography",
        "voice": "anchor",
        "title": "Photography & Creative",
        "script": """Quick creative segment. The photography world is buzzing about a potential Fujifilm and Hasselblad tie-up.

According to sources cited by DPReview, Fujifilm has been in advanced talks to acquire Hasselblad's medium format division. If the deal goes through, Fujifilm would control both the GFX system and the Hasselblad X system, giving them dominant market share in mirrorless medium format. No official confirmation yet, but industry analysts say it makes strategic sense — Fujifilm gets Hasselblad's brand cachet and dealer network in Europe, while Hasselblad gets access to Fujifilm's sensor manufacturing.

Also, the new Sigma fifty millimeter f-one-point-two Art lens for L-mount is getting rave early reviews. Optically stunning, but at one point four kilograms, you might want to hit the gym before your next portrait session."""
    },
    {
        "id": "07_entertainment",
        "voice": "anchor",
        "title": "Entertainment",
        "script": """In entertainment, Oscar nomination voting closes today, with the ceremony set for March thirtieth.

The frontrunners for Best Picture are shaping up to be "The Return," a historical drama about Japanese internment camps that has swept the critics' awards circuit, and "Meridian," a sci-fi thriller from Denis Villeneuve that's become a surprise box-office hit. On the performance side, Saoirse Ronan is the odds-on favorite for Best Actress for her role in "Salt Road," while the Best Actor race is a genuine toss-up between Colman Domingo and Paul Mescal.

And streaming news — The Bear Season Four drops Friday on Hulu. Early reviews from critics who got screeners are calling it the best season yet. The show moves the action to London this time, with Carmy opening a pop-up restaurant during a culinary residency. If you're planning a weekend binge, clear your Friday evening."""
    },
    {
        "id": "08_wrap",
        "voice": "anchor",
        "title": "Wrap & Look-Ahead",
        "script": """That's your Tuesday briefing. Here's what to keep on your radar.

Today — watch the Marin County housing vote at six PM. The livestream will be on the county website. Tomorrow — NVIDIA reports after the bell. That's the biggest earnings print of the week. Thursday — Adobe reports, and Fed Chair Powell speaks at two PM Eastern. This weekend — hit the new Azalea Hill Loop on Mount Tam, check out the year-round farmer's market in San Rafael on Sunday, and maybe clear your schedule Friday night for The Bear Season Four.

I'm your anchor. Have a great Tuesday. We'll be back tomorrow morning with the NVIDIA breakdown and everything else you need to know. This has been MyPod."""
    },
]

# ─── Generation Logic ────────────────────────────────────────────────────────

def generate_audio(client: ElevenLabs, segment: dict, output_path: Path) -> bool:
    """Generate audio for a single segment using ElevenLabs."""
    voice_id = VOICE_MAP.get(segment["voice"], VOICE_MAP["anchor"])

    print(f"  Generating: {segment['title']} (voice: {segment['voice']})...")

    try:
        audio_generator = client.text_to_speech.convert(
            voice_id=voice_id,
            text=segment["script"],
            model_id=MODEL_ID,
            output_format="mp3_44100_128",
        )

        # Write audio chunks to file
        with open(output_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)

        file_size = output_path.stat().st_size
        print(f"    Saved: {output_path.name} ({file_size / 1024:.1f} KB)")
        return True

    except Exception as e:
        print(f"    ERROR: {e}")
        return False


def stitch_segments(segment_files: list[Path], output_path: Path):
    """Concatenate all segment MP3s into one episode using ffmpeg."""
    print("\nStitching segments with ffmpeg...")

    # Create ffmpeg concat file
    concat_file = TEMP_DIR / "concat.txt"
    with open(concat_file, "w") as f:
        for seg_file in segment_files:
            f.write(f"file '{seg_file.absolute()}'\n")

    # Run ffmpeg concat
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg error: {result.stderr}")
        # Try re-encoding if concat copy fails
        print("Retrying with re-encode...")
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-codec:a", "libmp3lame",
            "-b:a", "128k",
            "-ar", "44100",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ffmpeg re-encode error: {result.stderr}")
            return False

    file_size = output_path.stat().st_size
    duration_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", str(output_path)]
    duration_result = subprocess.run(duration_cmd, capture_output=True, text=True)
    duration = float(duration_result.stdout.strip()) if duration_result.returncode == 0 else 0

    print(f"Episode saved: {output_path}")
    print(f"  Size: {file_size / (1024*1024):.1f} MB")
    print(f"  Duration: {int(duration // 60)}:{int(duration % 60):02d}")
    return True


def main():
    print("=" * 60)
    print("MyPod Episode Generator")
    print("Tuesday, March 14, 2026 — Morning Brief")
    print("=" * 60)

    # Ensure directories exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize client
    print(f"\nInitializing ElevenLabs client...")
    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    # Check available voices (optional — helps verify API key works)
    try:
        voices = client.voices.get_all()
        print(f"API connected. {len(voices.voices)} voices available.")
    except Exception as e:
        print(f"ERROR: Could not connect to ElevenLabs API: {e}")
        print("Check your API key and internet connection.")
        sys.exit(1)

    # Generate each segment
    print(f"\nGenerating {len(SEGMENTS)} segments...\n")
    segment_files = []

    for i, segment in enumerate(SEGMENTS):
        output_path = TEMP_DIR / f"{segment['id']}.mp3"
        success = generate_audio(client, segment, output_path)

        if success:
            segment_files.append(output_path)
        else:
            print(f"  Skipping failed segment: {segment['title']}")

        # Small delay between API calls to be respectful
        if i < len(SEGMENTS) - 1:
            time.sleep(0.5)

    if not segment_files:
        print("\nERROR: No segments were generated successfully.")
        sys.exit(1)

    print(f"\n{len(segment_files)}/{len(SEGMENTS)} segments generated successfully.")

    # Stitch into single episode
    episode_path = OUTPUT_DIR / "2026-03-14.mp3"
    success = stitch_segments(segment_files, episode_path)

    if success:
        print("\n" + "=" * 60)
        print("Episode generated successfully!")
        print(f"File: {episode_path}")
        print("=" * 60)
        print("\nTo play in the app, update DEMO_AUDIO_URL in")
        print("src/components/views/EpisodePreview.tsx to:")
        print(f"  '/episodes/2026-03-14.mp3'")
    else:
        print("\nStitching failed. Individual segments are in:")
        print(f"  {TEMP_DIR}/")

    # Cleanup temp files (optional — keep for debugging)
    # import shutil
    # shutil.rmtree(TEMP_DIR)


if __name__ == "__main__":
    main()
