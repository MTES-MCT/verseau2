import { useState } from 'react';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import './FileDropZone.css';

export interface FileDropZoneProps {
  onFileChange: (file: File | null) => void;
  acceptedFileTypes?: string;
  label?: string;
  hint?: string;
  selectedFile?: File | null;
}

export function FileDropZone({
  onFileChange,
  acceptedFileTypes = '.xml',
  label = 'Fichier de données XML',
  hint = 'Formats acceptés : .xml',
  selectedFile: externalSelectedFile = null,
}: FileDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (file: File | undefined) => {
    if (!file) {
      onFileChange(null);
      return;
    }
    if (!file.name.endsWith('.xml')) {
      onFileChange(null);
      setError('Le fichier doit être un fichier XML.');
      return;
    }
    setError(null);
    onFileChange(file);
  };

  const handleInputFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    handleFileChange(event.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`drop-zone ${isDraggingOver ? 'is-dragged-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      role="region"
      aria-label="Zone de dépôt de fichier"
    >
      {!externalSelectedFile && (
        <p className="drop-zone-instruction">
          {isDraggingOver
            ? 'Déposez le fichier ici'
            : 'Glissez-déposez votre fichier XML ici ou cliquez pour sélectionner'}
        </p>
      )}
      <Upload
        label={label}
        state={error ? 'error' : 'default'}
        stateRelatedMessage={error}
        hint={externalSelectedFile ? `Fichier sélectionné : ${externalSelectedFile.name}` : hint}
        nativeInputProps={{
          accept: acceptedFileTypes,
          'aria-label': 'Sélectionner un fichier de données XML',
          onChange: handleInputFileChange,
        }}
      />
    </div>
  );
}
