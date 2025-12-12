import { useEffect, useState } from 'react';
import { QueueState } from '@/shared/types';
import { MESSAGE_TYPES } from '@/shared/constants';

const Popup = () => {
  const [state, setState] = useState<QueueState | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_QUEUE_STATE });
    setState(response.state);
    setLoading(false);
  }

  const addCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.url || !tab.title) return;

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ADD_TO_QUEUE,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
    });

    await loadState();
  }

  const addAllowedDomain = async () => {
    if (!newDomain.trim()) return;

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ADD_ALLOWED_DOMAIN,
      domain: newDomain.trim(),
    });

    setNewDomain('');
    await loadState();
  }

  const removeAllowedDomain = async (domain: string) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.REMOVE_ALLOWED_DOMAIN,
      domain,
    });

    await loadState();
  }

  const showAddAllowedDomain = !Boolean(state?.allowedDomains.length);

  const stopReading = async () => {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_QUEUE });
    await loadState();
  }

  if (loading) {
    return <div className="popup">Loading...</div>;
  }

  return (
    <div className="popup">
      <header className="header">
        <h1>🧘 Tab Zen</h1>
      </header>

      {state?.mainTab ? (
        <div className="main-tab">
          <button onClick={stopReading} className="btn-stop">
            Stop Reading
          </button>

          <h2 className="tab-title">{state.mainTab.title}</h2>

          {Object.keys(state.minorTabs).length > 0 && (
            <div className="minor-tabs">
              <h3>Related tabs ({Object.keys(state.minorTabs).length})</h3>
              <ul>
                {Object.values(state.minorTabs).map((tab) => (
                  <li key={tab.url}>{tab.title || tab.url}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="no-tab">
          <p>No active reading task</p>
          <button onClick={addCurrentTab} className="btn-primary">
            Add current tab to queue
          </button>
        </div>
      )}

      <div className="allowed-domains">
        <h3>Allowed domains</h3>
        <p className="help-text">These domains won't block tab switching</p>
        <ul className="domain-list">
          {state?.allowedDomains.map((domain) => (
            <li key={domain}>
              <span>{domain}</span>
              <button
                onClick={() => removeAllowedDomain(domain)}
                className="btn-remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {showAddAllowedDomain && (
          <div className="add-domain">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => e.key === 'Enter' && addAllowedDomain()}
            />
            <button onClick={addAllowedDomain} className="btn-add">
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Popup;