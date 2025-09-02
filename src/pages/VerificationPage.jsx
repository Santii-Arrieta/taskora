import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, Shield, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const FileUploadBox = ({ id, label, onFileChange, file, error, onClear }) => {
  const inputRef = useRef(null);

  const handleFileSelect = () => {
    inputRef.current?.click();
  };

  const borderColor = error ? 'border-destructive' : file ? 'border-primary' : 'border-gray-300';
  const bgColor = error ? 'bg-destructive/5' : file ? 'bg-primary/5' : 'bg-gray-50 hover:bg-gray-100';

  return (
    <div className="w-full">
      <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>
      <div
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${borderColor} ${bgColor}`}
        onClick={handleFileSelect}
      >
        {file ? (
          <>
            <FileText className="w-12 h-12 text-primary" />
            <p className="mt-2 text-sm font-semibold text-primary truncate max-w-full px-4">{file.name}</p>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onClear(id);
              }}
            >
              X
            </Button>
          </>
        ) : (
          <>
            <UploadCloud className={`w-12 h-12 ${error ? 'text-destructive' : 'text-gray-400'}`} />
            <p className="mt-2 text-sm text-gray-500"><span className={`font-semibold ${error ? 'text-destructive' : 'text-primary'}`}>Click para subir</span> o arrastra</p>
            <p className="text-xs text-gray-500">Solo imágenes (JPG, PNG)</p>
          </>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => onFileChange(e, id)}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{error}</p>}
    </div>
  );
};

const VerificationPage = () => {
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [files, setFiles] = useState({});
    const [fileErrors, setFileErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const docSets = useMemo(() => ({
        provider: [
            { id: 'dniFront', label: 'DNI (Frente)' },
            { id: 'dniBack', label: 'DNI (Dorso)' },
            { id: 'selfie', label: 'Selfie sosteniendo tu DNI' },
        ],
        ngo: [
            { id: 'govDoc', label: 'Documento Gubernamental de Validez' },
        ],
        client: [
            { id: 'dniFront', label: 'DNI (Frente)' },
            { id: 'selfie', label: 'Selfie sosteniendo tu DNI' },
        ]
    }), []);
    
    const handleFileChange = useCallback((e, type) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            const maxFileSize = 5 * 1024 * 1024; // 5MB

            if (!allowedTypes.includes(file.type)) {
                setFileErrors(prev => ({ ...prev, [type]: 'Tipo de archivo no válido. Solo JPG o PNG.' }));
                return;
            }
            if (file.size > maxFileSize) {
                setFileErrors(prev => ({ ...prev, [type]: 'El archivo es muy grande (máx 5MB).' }));
                return;
            }

            setFileErrors(prev => ({ ...prev, [type]: null }));
            setFiles(prev => ({ ...prev, [type]: file }));
        }
        e.target.value = null; 
    }, []);

    const handleClearFile = useCallback((type) => {
        setFiles(prev => {
            const newFiles = { ...prev };
            delete newFiles[type];
            return newFiles;
        });
        setFileErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[type];
            return newErrors;
        });
    }, []);
    
    if (!user) {
        navigate('/login');
        return null;
    }
    
    if (user.verified || user.verificationStatus === 'pending') {
        navigate('/dashboard');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const requiredDocs = docSets[user.userType];
        const uploadedDocs = Object.keys(files);
        const hasErrors = Object.values(fileErrors).some(err => err !== null);

        if (!requiredDocs || hasErrors || !requiredDocs.every(doc => uploadedDocs.includes(doc.id))) {
            toast({
                title: 'Revisa los requisitos',
                description: 'Asegúrate de subir todos los documentos requeridos sin errores.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        try {
            const uploadPromises = Object.entries(files).map(async ([type, file]) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('verifications')
                    .upload(fileName, file);

                if (uploadError) {
                    throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);
                }

                return { type, path: fileName, fileName: file.name };
            });

            const uploadedFilesData = await Promise.all(uploadPromises);

            await updateProfile({
                verificationStatus: 'pending',
                verificationDocs: uploadedFilesData,
            });

            toast({
                title: 'Solicitud enviada con éxito',
                description: 'Tus documentos están en revisión. Te notificaremos pronto.',
            });

            navigate('/dashboard');

        } catch (error) {
            console.error("Verification submission error:", error);
            toast({
                title: 'Error al enviar la verificación',
                description: `Hubo un problema al subir los archivos. ${error.message}. Inténtalo de nuevo.`,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const userTypeLabels = {
        provider: 'Proveedor',
        ngo: 'ONG',
        client: 'Cliente',
    };
    
    const docsToRender = docSets[user.userType] || [];

    return (
        <>
            <Helmet>
                <title>Verificación de Cuenta - Taskora</title>
                <meta name="description" content="Verifica tu cuenta para acceder a todas las funcionalidades." />
            </Helmet>
            <Navbar />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl w-full"
                >
                    <Card>
                        <CardHeader className="text-center">
                            <Shield className="mx-auto h-12 w-12 text-primary" />
                            <CardTitle className="mt-4 text-3xl font-extrabold text-gray-900">Verificación de Cuenta</CardTitle>
                            <CardDescription className="mt-2 text-lg text-gray-600">
                                Sube los siguientes documentos para verificar tu perfil de {userTypeLabels[user.userType]}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className={`grid grid-cols-1 ${docsToRender.length > 1 ? 'md:grid-cols-2' : ''} ${docsToRender.length > 2 ? 'lg:grid-cols-3' : ''} gap-6`}>
                                    {docsToRender.map(doc => (
                                        <FileUploadBox
                                            key={doc.id}
                                            id={doc.id}
                                            label={doc.label}
                                            file={files[doc.id]}
                                            error={fileErrors[doc.id]}
                                            onFileChange={handleFileChange}
                                            onClear={handleClearFile}
                                        />
                                    ))}
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" className="w-full flex justify-center py-3 px-4 text-base font-semibold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enviar para Verificación'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </>
    );
};

export default VerificationPage;