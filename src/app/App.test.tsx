import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { db } from '@/core/storage/db';

describe('Octonote Application Shell & Import Workflow', () => {
  beforeEach(async () => {
    await db.chats.clear();
    await db.messages.clear();
    await db.resources.clear();
  });

  it('renders application branding and header successfully', () => {
    render(<App />);
    expect(screen.getAllByText('Octonote').length).toBeGreaterThan(0);
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('Local Storage Only')).toBeInTheDocument();
  });

  it('renders all core navigation items', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'View Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Chats' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Resources' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Insights' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Settings' })).toBeInTheDocument();
  });

  it('navigates between views when navigation buttons are clicked', () => {
    render(<App />);

    // Switch to Chats
    fireEvent.click(screen.getByRole('button', { name: 'View Chats' }));
    expect(screen.getByText('Imported Chats')).toBeInTheDocument();
    expect(screen.getByText('No conversations imported yet')).toBeInTheDocument();

    // Switch to Resources
    fireEvent.click(screen.getByRole('button', { name: 'View Resources' }));
    expect(screen.getByText('Knowledge Resources')).toBeInTheDocument();
    expect(screen.getByText('No knowledge resources extracted')).toBeInTheDocument();

    // Switch to Search
    fireEvent.click(screen.getByRole('button', { name: 'View Search' }));
    expect(screen.getByText('Search & Discovery')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search conversations/i)).toBeInTheDocument();

    // Switch to Insights
    fireEvent.click(screen.getByRole('button', { name: 'View Insights' }));
    expect(screen.getByText('Conversation Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Awaiting conversation data')).toBeInTheDocument();

    // Switch to Settings
    fireEvent.click(screen.getByRole('button', { name: 'View Settings' }));
    expect(screen.getByText('Settings & Data Control')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Data Control')).toBeInTheDocument();
  });

  it('opens and closes the functional import dialog', () => {
    render(<App />);

    // Click import button
    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    // Verify modal is open with real dropzone
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Click to select or drag and drop WhatsApp export/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-Server Local Verification/i)).toBeInTheDocument();

    // Close modal via Cancel button
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    // Modal should be dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('parses a valid WhatsApp .txt file and displays real message preview and metadata', async () => {
    render(<App />);

    // Open import dialog
    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    const sampleChat = `15/01/2024, 10:30 - Messages and calls are end-to-end encrypted.
15/01/2024, 10:31 - Alice: Welcome to Octonote!
15/01/2024, 10:32 - Bob: Looking forward to testing this.`;

    const file = new File([sampleChat], 'WhatsApp Chat with Alice.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-upload-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByText(/Conversation Preview/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Octonote!')).toBeInTheDocument();
    expect(screen.getByText('Looking forward to testing this.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save to Workspace/i })).toBeInTheDocument();

    // Close preview via cancel/close
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Verify that the unsaved preview is visible in the Chats tab
    fireEvent.click(screen.getByRole('button', { name: 'View Chats' }));
    expect(screen.getByText(/Unsaved Preview:/i)).toBeInTheDocument();

    // Discard preview
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(screen.getByText('No conversations imported yet')).toBeInTheDocument();
  });

  it('saves an imported chat to local storage and persists across navigation', async () => {
    render(<App />);

    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    const sampleChat = `15/01/2024, 10:30 - Messages and calls are end-to-end encrypted.
15/01/2024, 10:31 - Alice: Saving to IndexedDB test message.`;

    const file = new File([sampleChat], 'WhatsApp Chat with Alice.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-upload-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save to Workspace/i })).toBeInTheDocument();
    });

    // Save to workspace
    fireEvent.click(screen.getByRole('button', { name: /Save to Workspace/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved to Local Workspace!/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    // Navigate to Chats tab
    fireEvent.click(screen.getByRole('button', { name: 'View Chats' }));

    await waitFor(() => {
      expect(screen.getByText('Imported WhatsApp Conversations')).toBeInTheDocument();
      expect(screen.getByText('View Messages')).toBeInTheDocument();
    });

    // View messages inside the chat
    fireEvent.click(screen.getByText('View Messages'));

    await waitFor(() => {
      expect(screen.getByText('Saving to IndexedDB test message.')).toBeInTheDocument();
      expect(screen.getByText(/IndexedDB Verified/i)).toBeInTheDocument();
    });

    // Delete chat from detail view
    fireEvent.click(screen.getByRole('button', { name: /Delete Chat/i }));
    expect(screen.getByText(/Confirm Delete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(screen.getByText('No conversations imported yet')).toBeInTheDocument();
    });
  });

  it('detects duplicate conversations during import and offers options', async () => {
    render(<App />);

    const sampleChat = `15/01/2024, 10:00 - Alice: Duplicate test message.`;
    const file = new File([sampleChat], 'chat.txt', { type: 'text/plain' });

    // First import and save
    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    let fileInput = screen.getByTestId('file-upload-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save to Workspace/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save to Workspace/i }));
    await waitFor(() => {
      expect(screen.getByText(/Saved to Local Workspace!/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    // Second import of the identical conversation
    fireEvent.click(importButtons[0]);
    fileInput = screen.getByTestId('file-upload-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Duplicate Conversation Detected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save as New Copy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Keep Existing/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Keep Existing/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('extracts resources upon import and displays them in the Resources view with safe attributes and source attribution', async () => {
    render(<App />);

    const sampleChat = `15/01/2024, 10:00 - Alice: Check out https://github.com/octonote/app for details.`;
    const file = new File([sampleChat], 'WhatsApp Chat with Alice.txt', { type: 'text/plain' });

    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    const fileInput = screen.getByTestId('file-upload-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save to Workspace/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save to Workspace/i }));
    await waitFor(() => {
      expect(screen.getByText(/Saved to Local Workspace!/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    // Navigate to Resources tab
    fireEvent.click(screen.getByRole('button', { name: 'View Resources' }));

    await waitFor(() => {
      expect(screen.getAllByText('Knowledge Resources').length).toBeGreaterThan(0);
      expect(screen.getAllByText('github.com').length).toBeGreaterThan(0);
      expect(screen.getByText('GitHub link')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /github\.com\/octonote\/app/i });
    expect(link).toHaveAttribute('href', 'https://github.com/octonote/app');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // Verify source attribution
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText(/Line 1/i)).toBeInTheDocument();
  });

  it('shows validation error with recovery instructions when an unsupported file is uploaded', async () => {
    render(<App />);

    const importButtons = screen.getAllByRole('button', { name: /import chat/i });
    fireEvent.click(importButtons[0]);

    const invalidFile = new File(['binary pdf content'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-upload-input');

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText('Unsupported file format.')).toBeInTheDocument();
      expect(screen.getByText(/Recovery Instructions:/i)).toBeInTheDocument();
    });
  });

  it('displays local-first privacy status indicators', () => {
    render(<App />);
    expect(screen.getByText('100% on device')).toBeInTheDocument();
    expect(screen.getByText(/local-first & zero-knowledge by architecture/i)).toBeInTheDocument();
  });
});
