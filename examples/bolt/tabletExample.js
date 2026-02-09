/**
 * Web3 Smart Contract Trading Interface
 * Features scaling for Screen/World space and List/Detail navigation.
 */

// 1. CONFIG & STYLES
const THEME = {
  bg: 'rgba(10, 12, 18, 0.95)',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  accent: '#3b82f6', // Monad Blue
  success: '#10b981',
  danger: '#ef4444',
  text: '#ffffff',
  textDim: '#94a3b8',
  radius: 12,
};

const scale = (s, w) => (app.props.uiSpace === 'world' ? w : s);

app.configure([
  {
    type: 'switch',
    key: 'uiSpace',
    label: 'UI Space',
    options: [
      { label: 'Screen', value: 'screen' },
      { label: 'World', value: 'world' }
    ],
    initial: 'screen'
  }
]);

// 2. TOKEN CONFIG & STATE
const TOKEN_CONFIG = [
  { symbol: 'MON', name: 'Monad', address: '0x0000000000000000000000000000000000000000', network: 'monad' },
  { symbol: 'BOLT', name: 'BoltAI', address: '0xe32C6B8e7D9cADf1fFc5cBd58817F47F91e87777', network: 'monad' },
  { symbol: 'USDC', name: 'USDC', address: '0x754704bc059f8c67012fed69bc8a327a5aafb603', network: 'monad' },
];

app.state.tokens = TOKEN_CONFIG.map(t => ({
  ...t,
  price: t.symbol === 'MON' ? '3.45' : '0.0000085',
  change: '+0.0%',
  decimals: t.symbol === 'BOLT' ? 8 : 2
}));

app.state.view = 'list'; // 'list' or 'trade'
app.state.selectedToken = null;
app.state.lastRefresh = 0;
app.state.status = ''; // Transaction status feedback
app.state.amount = '0'; // Current input amount
app.state.balances = {}; // Token address -> balance string
app.state.connected = false;
app.state.address = null;
app.state.ensName = null;

// 3. CONTRACTS & ABI
const NAD_ROUTER = '0x6F6B8F1a20703309951a5127c45B49b1CD981A22';
const NAD_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'buy',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'sell',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const ERC20_ABI = [
  {
    constant: false,
    inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

const connectWallet = async () => {
  if (app.state.connected) return;
  try {
    app.state.status = '⏳ Connecting Wallet...';
    render();
    const result = await world.evm.connect();
    if (result.success) {
      app.state.connected = true;
      app.state.address = result.address || world.evm.address;
      app.state.status = '✅ Wallet Connected';
      await resolveEns();
      await fetchBalances();
      app.emit('walletConnected', { address: app.state.address });
    } else {
      app.state.status = '❌ Connection Failed';
    }
  } catch (err) {
    if (err.message?.includes('User cancelled') || err.message?.includes('User rejected')) {
      app.state.status = 'Connection Cancelled';
    } else {
      console.error('Connect failed:', err);
      app.state.status = 'Connect Error';
    }
  }
  render();
  setTimeout(() => { app.state.status = ''; render(); }, 3000);
};

const disconnectWallet = async () => {
  if (!app.state.connected) return;
  try {
    const result = await world.evm.disconnect();
    if (result.success) {
      app.state.connected = false;
      app.state.address = null;
      app.state.ensName = null;
      app.state.balances = {};
      app.state.status = '🌐 Disconnected';
      app.emit('walletDisconnected', {});
    }
  } catch (err) {
    console.error('Disconnect failed:', err);
  }
  render();
  setTimeout(() => { app.state.status = ''; render(); }, 3000);
};

const resolveEns = async () => {
  if (!app.state.address) return;
  try {
    const result = await world.evm.resolveName(app.state.address);
    if (result.success && result.name) {
      app.state.ensName = result.name;
      render();
    }
  } catch (err) {
    console.log('ENS resolve failed:', err.message);
  }
};

// 3. UI UTILS & DATA FETCHING
let mainUI = null;

const fetchBalances = async () => {
  if (!world.evm || !world.evm.isConnected || !world.evm.address) return;

  const newBalances = { ...app.state.balances };
  let updated = false;

  try {
    // 1. Fetch MON Balance
    const monBalance = await world.evm.actions.getBalance(world.evm.config, {
      address: world.evm.address,
    });
    const monFormatted = (Number(monBalance.value) / 1e18).toFixed(4);
    if (newBalances['0x0000000000000000000000000000000000000000'] !== monFormatted) {
      newBalances['0x0000000000000000000000000000000000000000'] = monFormatted;
      updated = true;
    }

    // 2. Fetch ERC20 Balances (BOLT, USDC)
    for (const token of TOKEN_CONFIG) {
      if (token.address === '0x0000000000000000000000000000000000000000') continue;
      
      const balance = await world.evm.actions.readContract(world.evm.config, {
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [world.evm.address],
      });
      
      const decimals = token.symbol === 'BOLT' ? 8 : 18; // Default to 18 if not specified
      const formatted = (Number(balance) / Math.pow(10, decimals)).toFixed(decimals === 8 ? 2 : 4);
      
      if (newBalances[token.address] !== formatted) {
        newBalances[token.address] = formatted;
        updated = true;
      }
    }

    if (updated) {
      app.state.balances = newBalances;
      render();
    }
  } catch (err) {
    console.error('Failed to fetch balances:', err);
  }
};

const onKeypadPress = (val) => {
  let current = app.state.amount === '0' ? '' : app.state.amount;
  
  if (val === 'Del') {
    current = current.slice(0, -1);
    if (!current) current = '0';
  } else if (val === '.') {
    if (!current.includes('.')) current += '.';
  } else {
    current += val;
  }
  
  app.state.amount = current;
  render();
};

const handleBuy = async (token) => {
  if (!app.state.connected) {
    await connectWallet();
    if (!app.state.connected) return;
  }

  const numericAmount = parseFloat(app.state.amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    app.state.status = 'Invalid Amount';
    render();
    return;
  }

  app.state.status = 'Processing Buy...';
  render();

  try {
    const amountIn = BigInt(Math.floor(numericAmount * 1e18));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
    
    const params = {
      amountOutMin: 0n,
      token: token.address,
      to: world.evm.address,
      deadline,
    };

    await world.evm.actions.writeContract(world.evm.config, {
      address: NAD_ROUTER,
      abi: NAD_ABI,
      functionName: 'buy',
      args: [params],
      value: amountIn,
    });

    app.state.status = 'Buy Successful!';
    fetchBalances(); // Refresh balances
  } catch (err) {
    console.error('Buy Failed:', err);
    app.state.status = 'Buy Failed.';
  }
  render();
  setTimeout(() => { app.state.status = ''; render(); }, 5000);
};

const handleSell = async (token) => {
  if (!app.state.connected) {
    await connectWallet();
    if (!app.state.connected) return;
  }

  const numericAmount = parseFloat(app.state.amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    app.state.status = 'Invalid Amount';
    render();
    return;
  }

  app.state.status = 'Processing Sell...';
  render();

  try {
    const decimals = token.symbol === 'BOLT' ? 8 : 18;
    const amountIn = BigInt(Math.floor(numericAmount * Math.pow(10, decimals)));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    app.state.status = 'Approving Tokens...';
    render();
    
    await world.evm.actions.writeContract(world.evm.config, {
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [NAD_ROUTER, amountIn],
    });

    app.state.status = 'Executing Sell...';
    render();

    const params = {
      amountIn,
      amountOutMin: 0n,
      token: token.address,
      to: world.evm.address,
      deadline,
    };

    await world.evm.actions.writeContract(world.evm.config, {
      address: NAD_ROUTER,
      abi: NAD_ABI,
      functionName: 'sell',
      args: [params],
    });

    app.state.status = 'Sell Successful!';
    fetchBalances(); // Refresh balances
  } catch (err) {
    console.error('Sell Failed:', err);
    app.state.status = 'Sell Failed.';
  }
  render();
  setTimeout(() => { app.state.status = ''; render(); }, 5000);
};

const fetchPrices = async () => {
  if (!world.isClient || !app.state.tokens) return;
  
  // Only refresh every 30 seconds to avoid rate limits
  if (Date.now() - app.state.lastRefresh < 30000) return;
  app.state.lastRefresh = Date.now();

  try {
    const addresses = TOKEN_CONFIG.filter(t => t.address && t.address !== '0x0000000000000000000000000000000000000000').map(t => t.address).join(',');
    
    // Default/Speculative values for Monad if not indexed on DexScreener yet
    let newTokens = app.state.tokens.map(t => ({ ...t }));
    let updated = false;

    if (addresses) {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
      if (res) {
        const data = await res.json();
        
        if (data && data.pairs && data.pairs.length > 0) {
          newTokens = newTokens.map(token => {
            const pair = data.pairs.find(p => p.baseToken.address.toLowerCase() === token.address?.toLowerCase());
            if (pair) {
              updated = true;
              return {
                ...token,
                price: pair.priceUsd,
                change: (pair.priceChange?.h24 > 0 ? '+' : '') + (pair.priceChange?.h24 || '0.0') + '%',
              };
            }
            return token;
          });
        }
      }
    }

    // Always ensure tokens have realistic speculative prices if not fetched
    newTokens = newTokens.map(token => {
      if (token.symbol === 'MON' && (token.price === '...' || token.price === '0.00')) {
        updated = true;
        return { ...token, price: '3.45', change: '+12.5%' };
      }
      if (token.symbol === 'BOLT' && (token.price === '...' || token.price === '0.00')) {
        updated = true;
        return { ...token, price: '0.0000085', change: '+2.1%' };
      }
      if (token.symbol === 'USDC' && (token.price === '...' || token.price === '0.00')) {
        updated = true;
        return { ...token, price: '1.00', change: '0.0%' };
      }
      return token;
    });

    if (updated) {
      app.state.tokens = newTokens;
      render();
    }
  } catch (err) {
    console.error('Failed to fetch prices:', err);
  }
};

const clearUI = () => {
  if (mainUI) {
    world.remove(mainUI);
    mainUI = null;
  }
};

// 4. NAVIGATION & RENDERING
const showList = () => {
  app.state.view = 'list';
  render();
};

const showTrade = (token) => {
  app.state.selectedToken = token;
  app.state.view = 'trade';
  render();
};

const render = () => {
  if (!world.isClient) return;

  const isWorld = app.props.uiSpace === 'world';
  const W = scale(400, 250);
  const H = scale(620, 380);
  const P = scale(20, 10);
  const contentW = W - P * 2;

  if (!mainUI) {
    mainUI = app.create('ui', {
      space: app.props.uiSpace,
      pivot: 'center',
      position: isWorld ? [0, 0, 0] : [0.5, 0.5, 0],
      width: W,
      height: H,
      backgroundColor: THEME.bg,
      borderRadius: THEME.radius,
      padding: P,
      flexDirection: 'column',
      gap: scale(15, 8),
      billboard: isWorld ? 'full' : 'none',
      borderWidth: isWorld ? 1 : 0,
      borderColor: THEME.accent,
    });
    world.add(mainUI);

    if (isWorld) {
      const player = world.getPlayer();
      if (player) {
        mainUI.position.copy(player.position).add(new Vector3(0, 1.5, 1.5));
      }
    }
  }

  // Clear children for refresh
  while (mainUI.children.length > 0) {
    mainUI.remove(mainUI.children[0]);
  }

  if (app.state.view === 'list') {
    renderListView(mainUI, contentW);
  } else {
    renderTradeView(mainUI, contentW);
  }
};

const renderListView = (parent, contentW) => {
  // Title
  parent.add(app.create('uitext', {
    value: 'Trade Terminal',
    fontSize: scale(20, 14),
    color: THEME.text,
    fontWeight: 'bold',
    marginBottom: scale(10, 5),
  }));

  // Token List
  const list = app.create('uiview', {
    width: contentW,
    flex: 1,
    flexDirection: 'column',
    gap: 8,
  });

  app.state.tokens.forEach(token => {
    const row = app.create('uiview', {
      width: contentW,
      height: scale(55, 35),
      backgroundColor: THEME.bgHover,
      borderRadius: 8,
      padding: scale(10, 5),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    });

    const info = app.create('uiview', { flexDirection: 'column' });
    info.add(app.create('uitext', { value: token.symbol, fontSize: scale(14, 10), fontWeight: 'bold' }));
    info.add(app.create('uitext', { value: token.name, fontSize: scale(12, 8), color: THEME.textDim }));
    row.add(info);

    const priceView = app.create('uiview', { flexDirection: 'column', alignItems: 'flex-end' });
    
    // Format price with proper decimals
    const displayPrice = token.price === '...' ? '...' : `$${token.price}`;
    
    priceView.add(app.create('uitext', { 
      value: displayPrice, 
      fontSize: scale(14, 10),
      color: THEME.text
    }));
    
    priceView.add(app.create('uitext', { 
      value: token.change, 
      fontSize: scale(11, 7), 
      color: token.change.startsWith('+') ? THEME.success : THEME.danger 
    }));
    row.add(priceView);

    row.onPointerEnter = () => { row.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
    row.onPointerLeave = () => { row.backgroundColor = THEME.bgHover; };
    row.onPointerDown = () => showTrade(token);

    list.add(row);
  });

  parent.add(list);
};

const renderKeypad = (parent, contentW) => {
  const keypad = app.create('uiview', {
    width: contentW,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: scale(10, 5),
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Del'];
  const keyW = (contentW - 30) / 3;

  keys.forEach(key => {
    const btn = app.create('uiview', {
      width: keyW,
      height: scale(36, 22),
      backgroundColor: THEME.bgHover,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    });
    btn.add(app.create('uitext', { value: key, fontSize: scale(14, 10), fontWeight: 'bold' }));
    
    btn.onPointerEnter = () => { btn.backgroundColor = 'rgba(255,255,255,0.15)'; };
    btn.onPointerLeave = () => { btn.backgroundColor = THEME.bgHover; };
    btn.onPointerDown = () => onKeypadPress(key);
    
    keypad.add(btn);
  });

  parent.add(keypad);
};

const renderAutofillButtons = (parent, contentW) => {
  const container = app.create('uiview', {
    width: contentW,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: scale(15, 8),
  });

  const amounts = ['50', '500', '5000'];
  const btnW = (contentW - 20) / 3;

  amounts.forEach(amt => {
    const btn = app.create('uiview', {
      width: btnW,
      height: scale(30, 20),
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    });
    btn.add(app.create('uitext', { value: amt, fontSize: scale(12, 8), color: THEME.accent, fontWeight: 'bold' }));
    
    btn.onPointerEnter = () => { btn.backgroundColor = 'rgba(59, 130, 246, 0.2)'; };
    btn.onPointerLeave = () => { btn.backgroundColor = 'rgba(59, 130, 246, 0.1)'; };
    btn.onPointerDown = () => {
      app.state.amount = amt;
      render();
    };
    
    container.add(btn);
  });

  parent.add(container);
};

const renderTradeView = (parent, contentW) => {
  const token = app.state.selectedToken;

  // Header with Back Button
  const header = app.create('uiview', {
    width: contentW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12, 6),
    marginBottom: scale(10, 5),
  });

  const backBtn = app.create('uiview', {
    width: scale(32, 22),
    height: scale(32, 22),
    backgroundColor: THEME.bgHover,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  });
  const backIcon = app.create('uitext', { value: '<', fontSize: scale(18, 12), color: THEME.text });
  backBtn.add(backIcon);
  backBtn.onPointerDown = showList;
  
  backBtn.onPointerEnter = () => { backBtn.backgroundColor = 'rgba(255,255,255,0.15)'; };
  backBtn.onPointerLeave = () => { backBtn.backgroundColor = THEME.bgHover; };
  
  header.add(backBtn);

  header.add(app.create('uitext', {
    value: `Trade ${token.symbol}`,
    fontSize: scale(20, 14),
    fontWeight: 'bold',
    color: THEME.text,
  }));
  parent.add(header);

  // Stats Row (Balance)
  const stats = app.create('uiview', {
    width: contentW,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(8, 4),
  });

  const address = app.state.address;
  const ensName = app.state.ensName;
  const balance = app.state.balances[token.address] || '0.00';
  const displayWallet = app.state.connected 
    ? (ensName || `${address.substring(0, 6)}...${address.substring(38)}`)
    : 'Connect Wallet';

  stats.add(app.create('uitext', { value: 'Available', fontSize: scale(12, 8), color: THEME.textDim }));
  
  const balanceRow = app.create('uiview', { flexDirection: 'row', gap: 8 });
  
  if (app.state.connected) {
    balanceRow.add(app.create('uitext', { 
      value: `${balance} ${token.symbol}`, 
      fontSize: scale(12, 8), 
      color: THEME.text 
    }));
  }

  const walletBtn = app.create('uitext', { 
    value: displayWallet, 
    fontSize: scale(12, 8), 
    color: THEME.accent,
    cursor: 'pointer'
  });
  
  walletBtn.onPointerDown = async () => {
    if (!app.state.connected) {
      await connectWallet();
    } else {
      // Show disconnect option or just refresh
      await disconnectWallet();
    }
  };
  
  balanceRow.add(walletBtn);
  stats.add(balanceRow);
  parent.add(stats);

  // Input Box with MAX button
  const inputContainer = app.create('uiview', {
    width: contentW,
    height: scale(65, 45),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10, 5),
  });

  const amountInfo = app.create('uiview', { flexDirection: 'column' });
  amountInfo.add(app.create('uitext', { value: 'Amount', fontSize: scale(10, 7), color: THEME.textDim, marginBottom: 2 }));
  amountInfo.add(app.create('uitext', { value: app.state.amount, fontSize: scale(16, 11), color: THEME.text, fontWeight: 'bold' }));
  inputContainer.add(amountInfo);

  const maxBtn = app.create('uiview', {
    // ... same as before
    width: scale(45, 30),
    height: scale(24, 16),
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  });
  maxBtn.add(app.create('uitext', { value: 'MAX', fontSize: scale(10, 7), color: THEME.accent, fontWeight: 'bold' }));
  maxBtn.onPointerDown = () => {
    app.state.amount = app.state.balances[token.address] || '0';
    render();
  };
  inputContainer.add(maxBtn);
  
  parent.add(inputContainer);

  // Autofill Buttons
  renderAutofillButtons(parent, contentW);

  // virtual Keypad
  renderKeypad(parent, contentW);

  // Buy/Sell Buttons
  const actions = app.create('uiview', {
    width: contentW,
    flexDirection: 'row',
    gap: 12,
    marginTop: scale(5, 2),
  });

  const btnW = (contentW - 12) / 2;

  const buyBtn = app.create('uiview', {
    width: btnW,
    height: scale(50, 35),
    backgroundColor: THEME.success,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  });
  buyBtn.add(app.create('uitext', { value: 'BUY', fontWeight: 'bold', color: '#000', fontSize: scale(14, 10) }));
  
  const sellBtn = app.create('uiview', {
    width: btnW,
    height: scale(50, 35),
    backgroundColor: THEME.danger,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  });
  sellBtn.add(app.create('uitext', { value: 'SELL', fontWeight: 'bold', color: '#000', fontSize: scale(14, 10) }));

  // Hover states for primary buttons
  buyBtn.onPointerEnter = () => { buyBtn.backgroundColor = '#34d399'; };
  buyBtn.onPointerLeave = () => { buyBtn.backgroundColor = THEME.success; };
  sellBtn.onPointerEnter = () => { sellBtn.backgroundColor = '#fb7185'; };
  sellBtn.onPointerLeave = () => { sellBtn.backgroundColor = THEME.danger; };

  buyBtn.onPointerDown = () => handleBuy(token);
  sellBtn.onPointerDown = () => handleSell(token);

  actions.add(buyBtn);
  actions.add(sellBtn);
  parent.add(actions);

  // Status Indicator
  if (app.state.status) {
    const statusRow = app.create('uiview', {
      width: contentW,
      marginTop: scale(10, 5),
      justifyContent: 'center',
    });
    statusRow.add(app.create('uitext', {
      value: app.state.status,
      fontSize: scale(12, 8),
      color: app.state.status.includes('Failed') ? THEME.danger : THEME.accent,
      fontWeight: 'bold',
    }));
    parent.add(statusRow);
  }

  // Estimated Output
  const footer = app.create('uiview', {
    width: contentW,
    marginTop: scale(10, 5),
    alignItems: 'center',
  });

  const numericAmount = parseFloat(app.state.amount) || 0;
  let estOutput = '0.00';
  let estSymbol = 'Tokens';

  if (token.symbol === 'USDC' || token.symbol === 'BOLT') {
    // Buying tokens with MON (simplification: assume price is in MON for now or just tokens)
    const tokenPrice = parseFloat(token.price) || 1;
    estOutput = (numericAmount * 3.45 / tokenPrice).toFixed(2); // MON price placeholder $3.45
    estSymbol = token.symbol;
  } else if (token.symbol === 'MON') {
    // Selling MON for USDC? Or buying MON? 
    // Usually nad.fun is Buy Token with MON, or Sell Token for MON.
    // If selected is MON, we might be buying BOLT/USDC? 
    // Let's assume the view is context-sensitive. 
    // Most users select a token (BOLT) then Buy/Sell.
    estOutput = (numericAmount * 3.45).toFixed(2);
    estSymbol = 'USDC';
  }

  footer.add(app.create('uitext', { 
    value: `Est. Output: ${estOutput} ${estSymbol}`, 
    fontSize: scale(11, 7), 
    color: THEME.textDim 
  }));
  parent.add(footer);
};

// 5. INITIALIZATION
if (world.isClient) {
  // Sync with global wallet state on start
  if (world.evm?.isConnected) {
    app.state.connected = true;
    app.state.address = world.evm.address;
    resolveEns();
  }

  render();
  fetchPrices();
  fetchBalances();
  
  app.on('config', render);
  
  // Polling for prices and balances
  app.on('update', () => {
    fetchPrices();
    fetchBalances();
  });

  // Global Wallet Event Listeners
  app.on('walletConnected', (e) => {
    app.state.connected = true;
    app.state.address = e.address || world.evm.address;
    resolveEns();
    fetchBalances();
    render();
  });

  app.on('walletDisconnected', () => {
    app.state.connected = false;
    app.state.address = null;
    app.state.ensName = null;
    app.state.balances = {};
    render();
  });
}
