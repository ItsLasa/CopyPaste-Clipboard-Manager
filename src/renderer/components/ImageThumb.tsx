import { FileImage } from 'lucide-react'

interface ImageThumbProps {
  blobPath: string | null
}

export function ImageThumb({ blobPath }: ImageThumbProps): React.JSX.Element {
  if (!blobPath) {
    return (
      <div className="flex items-center justify-center h-20 bg-bg rounded-lg">
        <FileImage size={24} className="text-fg-subtle" />
      </div>
    )
  }

  const fullPath = `safe-file://${blobPath}`

  return (
    <div className="relative overflow-hidden rounded-lg bg-bg h-20">
      <img
        src={fullPath}
        alt="Clip thumbnail"
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
      />
    </div>
  )
}
