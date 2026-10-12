import { Composition } from 'remotion';
import { Summary, SUMMARY_FRAMES } from './Summary';

export const Root = () => (
  <>
    {/* Full summary with captions (watch on demand) */}
    <Composition id="Summary" component={Summary} durationInFrames={SUMMARY_FRAMES} fps={30} width={1280} height={720} defaultProps={{ captions: true }} />
    {/* Text-free loop for the "What we do" background */}
    <Composition id="SummaryBg" component={Summary} durationInFrames={SUMMARY_FRAMES} fps={30} width={1280} height={720} defaultProps={{ captions: false }} />
  </>
);
