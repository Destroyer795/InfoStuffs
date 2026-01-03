import React from 'react';
import MdEditor from 'react-markdown-editor-lite';
import MarkdownIt from 'markdown-it';
import { useTheme } from '@mui/material/styles';
import 'react-markdown-editor-lite/lib/index.css';

// Markdown parser
const mdParser = new MarkdownIt();

const MarkdownInput = ({ value, onChange, placeholder }) => {
  const theme = useTheme();
  
  // Theme colors
  const borderColor = theme.palette.text.primary;
  const bgColor = theme.palette.background.paper;
  const textColor = theme.palette.text.primary;
  const toolbarBg = theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5';
  const hoverColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const codeBg = theme.palette.mode === 'dark' ? '#111' : '#f5f5f5';

  return (
    <div className="cursor-hover-target" style={{ 
      border: `2px solid ${borderColor}`, 
      borderRadius: '0px', 
      overflow: 'hidden',
      marginTop: '8px'
    }}>
      {/* Editor styles */}
      <style>{`
        .rc-md-editor {
          background-color: ${bgColor} !important;
          color: ${textColor} !important;
          border: none !important;
        }
        
        /* Toolbar */
        .rc-md-navigation {
          background-color: ${toolbarBg} !important;
          border-bottom: 2px solid ${borderColor} !important;
        }
        .rc-md-navigation .button-wrap:hover {
          background-color: ${hoverColor} !important;
        }
        .rc-md-navigation .button-wrap .button-type-d {
          color: ${textColor} !important;
          fill: ${textColor} !important;
        }

        /* Input area */
        .rc-md-editor .editor-container .section {
          background-color: ${bgColor} !important;
        }
        .rc-md-editor .editor-container .input {
          background-color: ${bgColor} !important;
          color: ${textColor} !important;
          font-family: "Inter", sans-serif !important;
        }

        /* Preview text */
        .rc-md-editor .custom-html-style {
          color: ${textColor} !important;
          font-family: "Inter", sans-serif !important;
        }

        /* Code blocks */
        .rc-md-editor .custom-html-style pre {
          background-color: ${codeBg} !important;
          padding: 12px !important;
          border: 1px solid ${borderColor} !important;
          border-radius: 0px !important;
          overflow-x: auto !important;
          margin-bottom: 1em !important;
        }
        .rc-md-editor .custom-html-style code {
          font-family: monospace !important;
          background-color: ${codeBg} !important;
          padding: 2px 4px !important;
          border-radius: 2px !important;
        }
        .rc-md-editor .custom-html-style pre code {
          background-color: transparent !important;
          padding: 0 !important;
          border: none !important;
        }

        /* Blockquotes */
        .rc-md-editor .custom-html-style blockquote {
          border-left: 6px solid ${borderColor} !important;
          background-color: ${codeBg} !important;
          margin: 1.5em 0 !important;
          padding: 16px 24px !important;
          color: ${textColor} !important;
          font-style: italic !important;
        }

        /* Fullscreen mode */
        .rc-md-editor.full {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          margin: 0 !important;
          border: none !important;
        }
      `}</style>

      <MdEditor
        style={{ height: '350px' }}
        renderHTML={(text) => mdParser.render(text)}
        onChange={({ text }) => onChange(text)}
        value={value || ''}
        placeholder={placeholder}
        view={{ menu: true, md: true, html: false }}
        config={{
          view: {
             menu: true,
             md: true,
             html: false
          }
        }}
      />
    </div>
  );
};

export default MarkdownInput;