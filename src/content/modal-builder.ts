interface ModalData {
  minorTabs: Array<{ tabId: number; title?: string; url: string }>;
}

interface ModalCallbacks {
  onSelectTab: (tabId: number) => void;
  onSkipAll: () => void;
}

const createOverlay = (): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  `;
  return overlay;
};

const createModalContainer = (): HTMLDivElement => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;
  return modal;
};

const createTitle = (): HTMLHeadingElement => {
  const title = document.createElement('h2');
  title.style.cssText = `
    font-size: 24px;
  `;
  title.textContent = '🎉 Reading completed!';
  return title;
};

const createTabListTitle = (count: number): HTMLParagraphElement => {
  const title = document.createElement('p');
  title.style.cssText = `
    font-weight: 500;
    
  `;
  title.textContent = `You have ${count} related tab${count > 1 ? 's' : ''} to read:`;
  return title;
};

const createTabOption = (tab: { tabId: number; title?: string; url: string }): HTMLLabelElement => {
  const label = document.createElement('label');
  label.style.cssText = `
    display: flex;
    align-items: center;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
  `;

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'next-tab';
  radio.value = tab.tabId.toString();
  radio.style.marginRight = '8px';

  const span = document.createElement('span');
  span.style.fontSize = '14px';
  span.textContent = tab.title || tab.url;

  label.appendChild(radio);
  label.appendChild(span);

  return label;
};

const createTabList = (tabs: Array<{ tabId: number; title?: string; url: string }>): HTMLDivElement => {
  const container = document.createElement('div');
  container.id = 'tab-list';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 200px;
    overflow-y: auto;
  `;

  tabs.forEach(tab => {
    container.appendChild(createTabOption(tab));
  });

  return container;
};

const createPrimaryButton = (): HTMLButtonElement => {
  const button = document.createElement('button');
  button.id = 'start-reading';
  button.style.cssText = `
    padding: 12px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  `;
  button.textContent = 'Start reading';
  return button;
};

const createSecondaryButton = (hasMinorTabs: boolean): HTMLButtonElement => {
  const button = document.createElement('button');
  button.id = 'skip-all';
  button.style.cssText = `
    padding: 12px 24px;
    background: #e5e7eb;
    color: #374151;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  `;
  button.textContent = hasMinorTabs ? 'Skip all' : 'Close';
  return button;
};

const createButtonContainer = (hasMinorTabs: boolean): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
  `;

  if (hasMinorTabs) {
    container.appendChild(createPrimaryButton());
  }
  container.appendChild(createSecondaryButton(hasMinorTabs));

  return container;
};

const attachEventHandlers = (
  overlay: HTMLDivElement,
  modal: HTMLDivElement,
  callbacks: ModalCallbacks
): void => {
  const startBtn = modal.querySelector('#start-reading') as HTMLButtonElement | null;
  const skipBtn = modal.querySelector('#skip-all') as HTMLButtonElement | null;

  startBtn?.addEventListener('click', () => {
    const selected = modal.querySelector('input[name="next-tab"]:checked') as HTMLInputElement;
    if (selected) {
      callbacks.onSelectTab(parseInt(selected.value));
      overlay.remove();
    }
  });

  skipBtn?.addEventListener('click', () => {
    callbacks.onSkipAll();
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      callbacks.onSkipAll();
      overlay.remove();
    }
  });
};

export const buildModal = (data: ModalData, callbacks: ModalCallbacks): HTMLDivElement => {
  const overlay = createOverlay();
  const modal = createModalContainer();

  modal.appendChild(createTitle());

  if (Boolean(data.minorTabs.length)) {
    modal.appendChild(createTabListTitle(data.minorTabs.length));
    modal.appendChild(createTabList(data.minorTabs));
  }

  modal.appendChild(createButtonContainer(Boolean(data.minorTabs.length)));

  overlay.appendChild(modal);
  attachEventHandlers(overlay, modal, callbacks);
  return overlay;
};

