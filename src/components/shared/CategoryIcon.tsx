import React from 'react';
import { 
  BookOpen, 
  Cpu, 
  Beaker, 
  Palette, 
  Briefcase, 
  Users, 
  Languages, 
  Calculator, 
  Activity, 
  Settings, 
  Globe2,
  Code2,
  Terminal,
  Microscope,
  Music,
  Zap,
  User,
  GraduationCap,
  Coffee,
  Database,
  Cloud,
  ShieldCheck,
  Smartphone,
  Brain,
  Layers,
  Layout,
  Server,
  Binary,
  GitBranch,
  Atom,
  Flame,
  Search,
  MessageSquare,
  Lock,
  Camera,
  Coins,
  Globe,
  Blocks,
  FileCode2,
  Workflow
} from 'lucide-react';

interface CategoryIconProps {
  category?: string;
  title?: string;
  className?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ category = '', title = '', className = '' }) => {
  const combinedText = `${category.toLowerCase()} ${title.toLowerCase()}`;

  // 1. Language Specific & High-Priority Tech
  if (combinedText.includes('python')) return <FileCode2 className={className} />;
  if (combinedText.includes('java') && !combinedText.includes('script')) return <Coffee className={className} />;
  if (combinedText.includes('javascript') || combinedText.includes(' js') || combinedText.includes('node')) return <Zap className={className} />;
  if (combinedText.includes('react') || combinedText.includes('angular') || combinedText.includes('vue')) return <Atom className={className} />;
  if (combinedText.includes('backend') || combinedText.includes('server')) return <Server className={className} />;
  if (combinedText.includes('frontend') || combinedText.includes('css') || combinedText.includes('html')) return <Layout className={className} />;
  if (combinedText.includes('sql') || combinedText.includes('database') || combinedText.includes('db')) return <Database className={className} />;
  if (combinedText.includes('cloud') || combinedText.includes('aws') || combinedText.includes('azure')) return <Cloud className={className} />;
  if (combinedText.includes('security') || combinedText.includes('cyber') || combinedText.includes('hack')) return <ShieldCheck className={className} />;
  if (combinedText.includes('mobile') || combinedText.includes('android') || combinedText.includes('ios')) return <Smartphone className={className} />;
  if (combinedText.includes('ai') || combinedText.includes('machine learning') || combinedText.includes('intelligence')) return <Brain className={className} />;
  if (combinedText.includes('data science') || combinedText.includes('algorithm') || combinedText.includes('math')) return <Binary className={className} />;
  if (combinedText.includes('git') || combinedText.includes('version')) return <GitBranch className={className} />;
  if (combinedText.includes('blockchain') || combinedText.includes('crypto')) return <Blocks className={className} />;
  if (combinedText.includes('devops') || combinedText.includes('docker') || combinedText.includes('kubernetes')) return <Workflow className={className} />;

  // 2. Broad Tech Categories
  if (combinedText.includes('tech') || combinedText.includes('software') || combinedText.includes('web') || combinedText.includes('computer')) {
    if (combinedText.includes('code') || combinedText.includes('dev')) return <Code2 className={className} />;
    if (combinedText.includes('terminal')) return <Terminal className={className} />;
    return <Cpu className={className} />;
  }
  
  // 3. Academic & Other Categories
  if (combinedText.includes('science') || combinedText.includes('biol') || combinedText.includes('chem')) {
    if (combinedText.includes('micro')) return <Microscope className={className} />;
    return <Beaker className={className} />;
  }
  
  if (combinedText.includes('math') || combinedText.includes('calc') || combinedText.includes('algebra')) {
    return <Calculator className={className} />;
  }
  
  if (combinedText.includes('art') || combinedText.includes('design') || combinedText.includes('photo')) {
    if (combinedText.includes('photo')) return <Camera className={className} />;
    return <Palette className={className} />;
  }

  if (combinedText.includes('music')) {
    return <Music className={className} />;
  }
  
  if (combinedText.includes('busin') || combinedText.includes('market') || combinedText.includes('financ')) {
    if (combinedText.includes('financ') || combinedText.includes('coin')) return <Coins className={className} />;
    return <Briefcase className={className} />;
  }
  
  if (combinedText.includes('human') || combinedText.includes('social') || combinedText.includes('hist')) {
    return <Users className={className} />;
  }
  
  if (combinedText.includes('lang') || combinedText.includes('engl') || combinedText.includes('liter')) {
    return <Languages className={className} />;
  }
  
  if (combinedText.includes('health') || combinedText.includes('fit') || combinedText.includes('med')) {
    return <Activity className={className} />;
  }

  if (combinedText.includes('engine')) {
    return <Settings className={className} />;
  }

  if (combinedText.includes('global') || combinedText.includes('world') || combinedText.includes('geo')) {
    return <Globe className={className} />;
  }

  // Fallbacks based on broad category
  if (category.toLowerCase() === 'technology') return <Cpu className={className} />;
  if (category.toLowerCase() === 'science') return <Beaker className={className} />;
  if (category.toLowerCase() === 'humanities') return <Users className={className} />;
  if (category.toLowerCase() === 'business') return <Briefcase className={className} />;
  if (category.toLowerCase() === 'arts') return <Palette className={className} />;

  // Default fallbacks
  if (title.toLowerCase().includes('instructor') || title.toLowerCase().includes('teacher')) return <User className={className} />;
  if (title.toLowerCase().includes('masterclass') || title.toLowerCase().includes('course')) return <GraduationCap className={className} />;
  
  return <BookOpen className={className} />;
};

export default CategoryIcon;
