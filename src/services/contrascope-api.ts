// 🔧 Modification minimale de votre ContraScope existant
// Ajoutez seulement ces quelques lignes à votre fichier principal

// 1. Import du nouveau service API (en haut du fichier)
import { analyzeContractWithContraScope } from './contrascope-api';

// 2. Remplacez votre fonction analyzeTextWithAPI par celle-ci :
async function analyzeTextWithAPI(text: string): Promise<Omit<AnalysisResult,"analyzedAt">> {
  try {
    console.log('🚀 Utilisation de ContraScope API...');
    
    // 📡 Appel via le nouveau service
    const result = await analyzeContractWithContraScope(text);
    
    console.log('✅ Analyse ContraScope réussie');
    return result;
    
  } catch (error) {
    console.error('❌ Erreur ContraScope API, fallback local:', error);
    
    // 🔄 Fallback vers l'analyse locale existante
    return analyzeTextLocally(text);
  }
}

// 3. Optionnel: Ajoutez un indicateur de statut API dans votre state
const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

// 4. Modifiez vos fonctions analyzeNow et analyzeFile pour gérer le statut :
const analyzeNow = async () => {
  if (textInput.trim()) {
    setBusy(true);
    setApiStatus('connecting');
    
    try {
      const analysisResult = await analyzeTextWithAPI(textInput);
      setResult({ 
        ...analysisResult, 
        analyzedAt: new Date().toISOString(), 
        fileName: lang==="FR" ? "Texte collé" : "Pasted text" 
      });
      setApiStatus('connected');
      
    } catch (error) {
      console.error('Erreur analyse:', error);
      setApiStatus('offline');
    } finally {
      setBusy(false);
    }
    return;
  }
  if (files[0]) await analyzeFile(files[0]);
};

const analyzeFile = async (file: File) => {
  setBusy(true);
  setApiStatus('connecting');
  
  try {
    const text = await extractTextFromFile(file);
    const analysisResult = await analyzeTextWithAPI(text);
    
    setResult({ 
      ...analysisResult, 
      analyzedAt: new Date().toISOString(), 
      fileName: file.name, 
      fileSize: file.size 
    });
    setApiStatus('connected');
    
  } catch (error) {
    console.error('Erreur analyse fichier:', error);
    setApiStatus('offline');
    alert(L.alertReadFail);
  } finally {
    setBusy(false);
  }
};

// 5. Mise à jour de l'indicateur de statut dans le header (remplacez l'ancien) :
<span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
  apiStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
  apiStatus === 'offline' ? 'bg-red-500/20 text-red-400' :
  'bg-blue-500/20 text-blue-400'
}`}>
  {apiStatus === 'connected' ? '🟢 ContraScope API' : 
   apiStatus === 'offline' ? '🔴 Mode Local' : 
   '🔄 Connexion...'}
</span>
