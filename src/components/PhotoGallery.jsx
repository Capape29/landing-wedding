import { useEffect, useMemo, useState } from 'react'

function isSafeBlobUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'blob:'
  } catch {
    return false
  }
}

function getSafePreviewStyle(url) {
  if (!isSafeBlobUrl(url)) {
    return undefined
  }

  const escapedUrl = url.replaceAll('"', '%22')
  return { backgroundImage: `url("${escapedUrl}")` }
}

function PhotoGallery() {
  const [selectedFiles, setSelectedFiles] = useState([])

  const previews = useMemo(
    () => selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles],
  )

  useEffect(
    () => () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url))
    },
    [previews],
  )

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    setSelectedFiles(files)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-serif text-3xl text-[#4e3f2d]">Álbum colaborativo</h2>
        <p className="text-sm text-[#6b5b45] sm:text-base">
          Sube tus recuerdos del evento. Puedes conectar aquí tu widget de
          Cloudinary o WedUploader.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-[#ccb592] bg-[#faf6ef] p-4 text-sm text-[#6b5b45]">
        <p className="font-medium">Zona de carga lista para integrar</p>
        <iframe
          title="Widget de carga de fotos"
          src="about:blank"
          className="mt-3 h-28 w-full rounded-xl border border-[#d8c9b2]/70 bg-white"
        />
      </div>

      <label
        htmlFor="photo-upload"
        className="inline-flex cursor-pointer items-center rounded-full bg-[#c5ab84] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#b99d74]"
      >
        Seleccionar fotos
      </label>
      <input
        id="photo-upload"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {previews.length === 0 ? (
          <p className="col-span-full rounded-xl border border-[#dcccb5] bg-white/80 p-4 text-sm text-[#6b5b45]">
            Aún no hay fotos seleccionadas.
          </p>
        ) : (
          previews.map(({ file, url }) => (
            <article
              key={`${file.name}-${file.lastModified}`}
              className="overflow-hidden rounded-xl border border-[#dcccb5] bg-white"
            >
              <div
                role="img"
                aria-label={file.name}
                className="h-48 w-full bg-cover bg-center"
                style={getSafePreviewStyle(url)}
              />
              <p className="truncate p-3 text-xs text-[#6b5b45]">{file.name}</p>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

export default PhotoGallery
