export default function GlowOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div
        className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
          filter: 'blur(200px)',
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 70%)',
          filter: 'blur(150px)',
        }}
      />
    </div>
  )
}
