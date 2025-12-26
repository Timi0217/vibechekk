import React from 'react';
import { Award, Zap, Code, GitBranch, Terminal } from 'lucide-react';
import '../vibe-card.css';

interface VibeCardProps {
    githubUrl: string;
    archetype: 'S' | 'A' | 'B' | 'C' | 'F';
    meritPoints: string[];
    trajectoryDelta: string;
}

export const VibeCard: React.FC<VibeCardProps> = ({ githubUrl, archetype, meritPoints, trajectoryDelta }) => {
    const getArchetypeLabel = () => {
        switch (archetype) {
            case 'S': return 'The Architect';
            case 'A': return 'The Independent Builder';
            case 'B': return 'The Safe Junior';
            case 'C': return 'The Tutorial Follower';
            case 'F': return 'The Ghost';
            default: return 'The Unknown';
        }
    };

    return (
        <div className="vibe-card-overlay">
            <div className={`archetype-badge archetype-${archetype}`}>
                {archetype} - {getArchetypeLabel()}
            </div>

            <div className="trajectory-header">Trajectory of Merit</div>
            <div className="trajectory-subtitle">Analyzing {githubUrl.split('/').pop()}'s 12-month delta</div>

            <div className="merit-section">
                <div className="merit-point">
                    <Zap className="merit-icon" size={16} />
                    <span><strong>Growth:</strong> {trajectoryDelta}</span>
                </div>

                {meritPoints.map((point, i) => (
                    <div key={i} className="merit-point">
                        <Award className="merit-icon" size={16} />
                        <span>{point}</span>
                    </div>
                ))}
            </div>

            <div className="footer-stats" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', gap: '15px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Code size={12} /> Atomic Commits
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GitBranch size={12} /> Refactor Logic
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Terminal size={12} /> DeepSeek-V3 Analysis
                </div>
            </div>
        </div>
    );
};
