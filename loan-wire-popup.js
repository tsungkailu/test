/**
 * <loan-wire-popup> — 貸款入款共用元件
 *
 * 使用方式：
 *   <script src="loan-wire-popup.js" defer></script>
 *   <loan-wire-popup id="loanWirePopup"></loan-wire-popup>
 *
 * 開啟：
 *   document.getElementById('loanWirePopup').open({
 *     orderNo: 'P2026030001',
 *     plate: 'RAC-1234',
 *     buyerName: '王小明',
 *     buyerId: 'A123456789',
 *     category: '尾款',
 *     amount: 80000,
 *     carAmt: 80000,
 *     overAmt: 0,
 *     institution: '中國信託',
 *     period: '36',
 *     rate: '2.5'
 *   });
 *
 * 監聽結果：
 *   document.getElementById('loanWirePopup').addEventListener('loan-wire-confirmed', (e) => {
 *     console.log(e.detail);
 *     // { wireSeq, loanWireDate, loanWireTotal, loanBank, loanLast5, loanPayerName, loanWireAmt }
 *   });
 *
 *   document.getElementById('loanWirePopup').addEventListener('loan-wire-cancelled', () => {
 *     // 使用者取消/關閉，未完成入款
 *   });
 *
 * 注意：查詢匯款記錄目前使用元件內建的假資料（this._wireData），
 * 之後要接後端 API 時，把 _searchWireRecords() 換成實際的 fetch 呼叫即可，
 * 對外的 open()/event 介面不需要變動。
 *
 * 測試用身分證/統編（內建假資料，可在「付款人統編 / 證號」欄位輸入測試）：
 *   A123456789 → 3 筆可選
 *   B987654321 → 2 筆可選
 *   C112233445 → 1 筆
 *   D556677889 → 2 筆可選（其中一筆金額較小）
 */
(function () {
  function fmt(n) {
    return Number(n || 0).toLocaleString();
  }

  const TEMPLATE_STYLE = `
    :host {
      --color-background-primary:#ffffff;
      --color-background-secondary:#f5f5f4;
      --color-background-tertiary:#efede8;
      --color-text-primary:#1a1a18;
      --color-text-secondary:#6b6b67;
      --color-border-tertiary:rgba(0,0,0,0.12);
      --color-border-secondary:rgba(0,0,0,0.22);
      --color-border-primary:rgba(0,0,0,0.35);
      --border-radius-md:8px;
      --border-radius-lg:12px;
      --font-sans:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;
      font-family: var(--font-sans);
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --color-background-primary:#1e1e1c;
        --color-background-secondary:#2a2a28;
        --color-background-tertiary:#323230;
        --color-text-primary:#f0ede8;
        --color-text-secondary:#9b9b96;
        --color-border-tertiary:rgba(255,255,255,0.1);
        --color-border-secondary:rgba(255,255,255,0.2);
        --color-border-primary:rgba(255,255,255,0.35);
      }
    }
    *{box-sizing:border-box;margin:0;padding:0}

    .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;align-items:center;justify-content:center;padding:32px 16px;overflow:hidden}
    .overlay.open{display:flex}
    .modal{background:var(--color-background-primary);border-radius:var(--border-radius-lg);width:800px;max-width:96vw;border:0.5px solid var(--color-border-tertiary);box-shadow:0 8px 32px rgba(0,0,0,0.2);max-height:calc(100vh - 64px);overflow-y:auto;color:var(--color-text-primary)}
    .modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:0.5px solid var(--color-border-tertiary)}
    .modal-head h2{font-size:15px;font-weight:500;margin:0}
    .modal-head .method-tag{font-size:12px;font-weight:500;padding:3px 10px;border-radius:20px;margin-left:10px}
    .badge-loan{background:#FAEEDA;color:#854F0B}
    .modal-close{background:none;border:none;cursor:pointer;color:var(--color-text-secondary);font-size:20px;line-height:1;padding:4px}
    .modal-close:hover{color:var(--color-text-primary)}
    .modal-body{padding:20px 24px}
    .modal-foot{padding:12px 24px;border-top:0.5px solid var(--color-border-tertiary);display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:var(--color-background-primary)}

    .order-info-bar{background:var(--color-background-secondary);border-bottom:0.5px solid var(--color-border-tertiary);padding:8px 24px;display:flex;flex-direction:column;gap:0}
    .order-info-row{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
    .order-info-row+.order-info-row{border-top:0.5px solid var(--color-border-tertiary);margin-top:0}
    .order-info-item{display:flex;flex-direction:column;gap:2px;padding:5px 0;min-width:0}
    .order-info-item+.order-info-item{border-left:0.5px solid var(--color-border-tertiary);padding-left:16px}
    .order-info-item .oi-label{font-size:11px;color:var(--color-text-secondary)}
    .order-info-item .oi-value{font-size:13px;color:var(--color-text-primary);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .order-info-item .oi-value.oi-amount{color:#185FA5}

    .top-row{display:flex;gap:12px;align-items:flex-end;margin-bottom:14px}
    .fg{display:flex;flex-direction:column;gap:4px;min-width:0}
    .fg label{font-size:12px;color:var(--color-text-secondary);white-space:nowrap}
    .fg label .req{color:#A32D2D}
    .fg select,.fg input{padding:7px 10px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-primary);color:var(--color-text-primary);font-size:13px}
    .fg select:focus,.fg input:focus{outline:none;border-color:var(--color-border-primary)}
    .fg input:disabled{background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:default;border-color:var(--color-border-tertiary)}

    .btn-primary{padding:7px 20px;background:#185FA5;color:#fff;border:none;border-radius:var(--border-radius-md);font-size:13px;cursor:pointer;font-weight:500;white-space:nowrap;height:34px;flex-shrink:0}
    .btn-primary:hover{background:#0C447C}
    .btn-primary:disabled{background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:not-allowed;border:0.5px solid var(--color-border-tertiary)}
    .btn-cancel{padding:7px 16px;background:transparent;color:var(--color-text-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);font-size:13px;cursor:pointer}
    .btn-cancel:hover{background:var(--color-background-secondary)}
    .btn-sel{padding:5px 14px;font-size:12px;font-weight:500;border:none;border-radius:var(--border-radius-md);cursor:pointer;background:#185FA5;color:#fff;min-width:52px}
    .btn-sel:hover{background:#0C447C}
    .btn-sel.active{background:#0C447C}

    .tbl{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
    .tbl th{background:var(--color-background-secondary);padding:8px 12px;text-align:left;font-weight:500;color:var(--color-text-secondary);border:0.5px solid var(--color-border-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tbl td{padding:8px 12px;border:0.5px solid var(--color-border-tertiary);color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tbl tbody tr:hover td{background:var(--color-background-secondary)}
    .tbl tbody tr.selected td{background:#E6F1FB}
    .tbl col.c-op{width:70px}.tbl col.c-date{width:100px}.tbl col.c-seq{width:80px}
    .tbl col.c-amt{width:90px}.tbl col.c-bank{width:130px}.tbl col.c-last5{width:90px}.tbl col.c-name{width:auto}

    .sel-section{margin-top:20px}
    .sel-label{font-size:13px;font-weight:500;margin-bottom:10px}
    .sel-tbl{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
    .sel-tbl th{background:var(--color-background-secondary);padding:8px 14px;text-align:left;font-weight:500;color:var(--color-text-secondary);border:0.5px solid var(--color-border-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sel-tbl td{padding:10px 14px;border:0.5px solid var(--color-border-tertiary);color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
    .sel-tbl col.sc-date{width:110px}.sel-tbl col.sc-seq{width:90px}.sel-tbl col.sc-total{width:110px}
    .sel-tbl col.sc-allocated{width:160px}.sel-tbl col.sc-avail{width:120px}
    .sel-tbl td.avail{background:#E6F1FB;font-weight:500;color:#0C447C}
    .sel-tbl th.avail-th{background:#B5D4F4;color:#042C53}
    .allocated-cell{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .btn-detail{padding:3px 10px;font-size:11px;font-weight:500;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:pointer;flex-shrink:0}
    .btn-detail:hover{background:var(--color-background-primary);color:var(--color-text-primary)}
    .btn-detail.open{background:#E6F1FB;color:#185FA5;border-color:#B5D4F4}
    .detail-row td{padding:0!important;border-top:none!important}
    .detail-inner{background:#F7FBFF;border-top:0.5px solid #B5D4F4;padding:10px 16px;display:none}
    .detail-inner.open{display:block}
    .detail-inner-title{font-size:11px;font-weight:500;color:#185FA5;margin-bottom:8px}
    .detail-list{display:flex;flex-wrap:wrap;gap:8px}
    .detail-chip{display:flex;align-items:center;gap:10px;background:#fff;border:0.5px solid #B5D4F4;border-radius:var(--border-radius-md);padding:6px 12px;font-size:12px}
    .detail-chip .chip-order{color:#185FA5;font-weight:500}

    .alloc-row{display:flex;gap:16px;align-items:flex-start;margin-top:16px}
    .alloc-field{display:flex;flex-direction:column;gap:6px;flex:1}
    .alloc-field label{font-size:12px;color:var(--color-text-secondary)}
    .alloc-field label .req{color:#A32D2D}
    .check-row{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--color-text-secondary);cursor:pointer;user-select:none}
    .check-row input[type="checkbox"]{width:14px;height:14px;accent-color:#185FA5;cursor:pointer;flex-shrink:0}
    .alloc-box{display:flex;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);overflow:hidden}
    .alloc-box input{flex:1;padding:8px 12px;border:none;background:var(--color-background-primary);color:var(--color-text-primary);font-size:14px;outline:none;min-width:0}
    .alloc-box input::placeholder{font-size:12px;color:var(--color-text-secondary)}
    .alloc-box input:disabled{background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:default}
    .alloc-box .unit{padding:8px 12px;background:var(--color-background-secondary);color:var(--color-text-secondary);font-size:13px;border-left:0.5px solid var(--color-border-secondary);flex-shrink:0}
    .alloc-box.disabled-box{background:var(--color-background-secondary);border-color:var(--color-border-tertiary)}
    .alloc-box.disabled-box .unit{border-left-color:var(--color-border-tertiary)}
    .alloc-box.err-box{border-color:#A32D2D}
    .err-msg{font-size:11px;color:#A32D2D;margin-top:2px;min-height:16px}

    .hint-box{padding:10px 14px;border-radius:var(--border-radius-md);font-size:12px}
    .hint-info{background:#EAF3DE;border:0.5px solid #8CC152;color:#27500A}
    .hint-warn{background:#FFFBEB;border:0.5px solid #F5C842;color:#7A5C00}
  `;

  const TEMPLATE_HTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-head">
          <h2>貸款入款</h2>
          <button class="modal-close" id="btnClose" aria-label="關閉"><span>&times;</span></button>
        </div>

        <div class="order-info-bar">
          <div class="order-info-row">
            <div class="order-info-item"><span class="oi-label">訂單</span><span class="oi-value" id="oiOrderNo">—</span></div>
            <div class="order-info-item"><span class="oi-label">車牌</span><span class="oi-value" id="oiPlate">—</span></div>
            <div class="order-info-item"><span class="oi-label">買受人</span><span class="oi-value" id="oiBuyer">—</span></div>
          </div>
          <div class="order-info-row" id="loanRow2"></div>
          <div class="order-info-row" id="loanRow3"></div>
        </div>

        <div style="padding:10px 24px 0">
          <div class="hint-box hint-info">
            <span style="font-size:13px;vertical-align:-1px;margin-right:6px">ℹ</span>
            查詢匯款記錄並分配貸款款項。確認後此筆貸款付款將完成。
          </div>
        </div>

        <div class="modal-body">
          <div class="top-row" style="margin-bottom:14px">
            <div class="fg" style="width:130px;flex-shrink:0">
              <label>款項類別</label>
              <input type="text" id="categoryDisplay" disabled placeholder="—"/>
            </div>
            <div class="fg" style="flex:1;min-width:0">
              <label style="display:block;margin-bottom:4px">付款人統編 / 證號</label>
              <div style="display:flex;gap:8px">
                <input id="searchId" type="text" placeholder="統編或身分證字號" style="flex:1;min-width:0"/>
                <button class="btn-primary" id="btnSearch">查詢</button>
              </div>
            </div>
          </div>

          <div id="resultSection" style="display:none">
            <div style="margin-bottom:8px;font-size:11px;color:var(--color-text-secondary)">
              僅顯示匯款總額 ≥ 車貸金額的匯款記錄（車貸金額：<span id="carAmtHint">—</span> 元）
            </div>
            <table class="tbl" id="resultTable">
              <colgroup><col class="c-op"/><col class="c-date"/><col class="c-seq"/><col class="c-amt"/><col class="c-bank"/><col class="c-last5"/><col class="c-name"/></colgroup>
              <thead><tr><th>操作</th><th>入帳時間</th><th>匯款序號</th><th>匯款總額</th><th>匯款銀行</th><th>帳號末5碼</th><th>匯款人</th></tr></thead>
              <tbody id="resultBody"></tbody>
            </table>
            <div id="noMatch" style="display:none;padding:24px 12px;text-align:center;font-size:12px;color:var(--color-text-secondary)">
              <div style="font-size:24px;margin-bottom:8px;opacity:0.4">🔍</div>
              <div style="font-weight:500;margin-bottom:4px">查無符合的匯款記錄</div>
              <div>目前無匯款總額 ≥ 車貸金額（<span id="noMatchAmt">—</span> 元）的可用記錄</div>
            </div>
          </div>

          <div id="selectedSection" style="display:none" class="sel-section">
            <div style="margin-bottom:10px">
              <div class="sel-label" style="margin-bottom:2px">款項分配</div>
              <div style="font-size:11px;color:var(--color-text-secondary)">同一筆匯款金額，可分配給多筆訂單。請輸入本次分配金額</div>
            </div>
            <table class="sel-tbl">
              <colgroup><col class="sc-date"/><col class="sc-seq"/><col class="sc-total"/><col class="sc-allocated"/><col class="sc-avail"/></colgroup>
              <thead><tr><th>入帳時間</th><th>匯款序號</th><th>匯款總額</th><th>已分配金額</th><th class="avail-th">可分配金額</th></tr></thead>
              <tbody>
                <tr>
                  <td id="selDate">—</td><td id="selSeq">—</td><td id="selTotal">—</td>
                  <td><div class="allocated-cell"><span id="selAllocatedVal">—</span><button class="btn-detail" id="btnDetail">明細</button></div></td>
                  <td class="avail" id="selAvail">—</td>
                </tr>
                <tr class="detail-row"><td colspan="5"><div class="detail-inner" id="detailInner"><div class="detail-inner-title"><span style="font-size:13px;vertical-align:-1px;margin-right:4px">📋</span>已分配明細</div><div class="detail-list" id="detailList"></div></div></td></tr>
              </tbody>
            </table>
            <div class="alloc-row">
              <div class="alloc-field">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <label style="margin:0">本次分配金額 <span class="req">*</span></label>
                  <label class="check-row" style="font-weight:400">
                    <input type="checkbox" id="allocAll" checked/>
                    帶入全部餘額
                  </label>
                </div>
                <div class="alloc-box" id="allocBox">
                  <input type="number" id="allocInput" min="0" placeholder="請輸入金額"/>
                  <span class="unit">元</span>
                </div>
                <div class="err-msg" id="allocErr"></div>
              </div>
              <div class="alloc-field">
                <label>剩餘未分配款項</label>
                <div class="alloc-box disabled-box">
                  <input type="text" id="remainInput" disabled placeholder="—"/>
                  <span class="unit">元</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:0 24px 12px">
          <div class="hint-box hint-warn">
            <span style="font-size:13px;vertical-align:-1px;margin-right:6px">⚠️</span>
            確認儲存後，此筆貸款付款狀態將更新為<strong>已完成</strong>，無法再修改。
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-cancel" id="btnCancel">取消</button>
          <button class="btn-primary" id="btnSave" disabled>確認完成</button>
        </div>
      </div>
    </div>
  `;

  class LoanWirePopup extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._shadow.innerHTML = `<style>${TEMPLATE_STYLE}</style>${TEMPLATE_HTML}`;

      // 內建假資料（之後接 API 時，把 _searchWireRecords() 換成真正的 fetch 即可）
      // 設計成同一個身分證/統編可以對應多筆匯款記錄，方便測試「選擇」流程
      this._wireData = [
        // 身分證 A123456789 — 3 筆可選
        { id: 'W001', payerId: 'A123456789', date: '2024/05/28', seq: '12345', total: 38000, allocated: 37000, bank: '台新銀行(812)', last5: '44986', name: '王小明',
          details: [{ order: 'P2026060001', amt: 20000 }, { order: 'P2026060002', amt: 17000 }] },
        { id: 'W002', payerId: 'A123456789', date: '2024/06/02', seq: '65432', total: 100000, allocated: 0, bank: '台新銀行(812)', last5: '44986', name: '王小明', details: [] },
        { id: 'W003', payerId: 'A123456789', date: '2024/06/10', seq: '32424', total: 53000, allocated: 0, bank: '中國信託(822)', last5: '77890', name: '王小明', details: [] },

        // 統編 B987654321 — 2 筆可選
        { id: 'W004', payerId: 'B987654321', date: '2024/05/30', seq: '23455', total: 98000, allocated: 65000, bank: '中國信託(822)', last5: '12345', name: '李大華',
          details: [{ order: 'P2026050010', amt: 50000 }, { order: 'P2026060002', amt: 15000 }] },
        { id: 'W005', payerId: 'B987654321', date: '2024/06/05', seq: '65544', total: 130000, allocated: 0, bank: '玉山銀行(808)', last5: '99001', name: '李大華', details: [] },

        // 統編 C112233445 — 1 筆
        { id: 'W006', payerId: 'C112233445', date: '2024/06/01', seq: '88991', total: 60000, allocated: 0, bank: '土地銀行(005)', last5: '55667', name: '陳小美', details: [] },

        // 統編 D556677889 — 2 筆可選（其中一筆金額較小，可用來測試「金額不足車貸金額」的情境）
        { id: 'W007', payerId: 'D556677889', date: '2024/06/03', seq: '11223', total: 45000, allocated: 0, bank: '國泰世華(013)', last5: '33445', name: '張志豪', details: [] },
        { id: 'W008', payerId: 'D556677889', date: '2024/06/08', seq: '99887', total: 150000, allocated: 0, bank: '國泰世華(013)', last5: '33445', name: '張志豪', details: [] },
      ];

      this._record = null;     // 由 open() 傳入的訂單/付款資訊
      this._selectedId = null; // 目前選中的匯款記錄 id
      this._detailOpen = false;

      this._bindEvents();
    }

    // ── 對外公開方法 ──
    open(record) {
      this._record = record || {};
      this._selectedId = null;
      this._detailOpen = false;
      this._renderOrderInfo();
      this._resetSearchUI();
      this._q('#overlay').classList.add('open');
    }

    close() {
      this._q('#overlay').classList.remove('open');
    }

    // ── 內部工具 ──
    _q(sel) {
      return this._shadow.querySelector(sel);
    }

    _bindEvents() {
      this._q('#btnClose').addEventListener('click', () => this._cancel());
      this._q('#btnCancel').addEventListener('click', () => this._cancel());
      this._q('#overlay').addEventListener('click', (e) => {
        if (e.target === this._q('#overlay')) this._cancel();
      });
      this._q('#btnSearch').addEventListener('click', () => this._doSearch());
      this._q('#allocAll').addEventListener('change', (e) => this._onAllocAll(e.target.checked));
      this._q('#allocInput').addEventListener('input', (e) => this._onAllocInput(e.target.value));
      this._q('#btnDetail').addEventListener('click', () => this._toggleDetail());
      this._q('#btnSave').addEventListener('click', () => this._doSave());
    }

    _cancel() {
      this.close();
      this.dispatchEvent(new CustomEvent('loan-wire-cancelled', { bubbles: true, composed: true }));
    }

    _renderOrderInfo() {
      const rec = this._record;
      this._q('#oiOrderNo').textContent = rec.orderNo || '—';
      this._q('#oiPlate').textContent = rec.plate || '—';
      this._q('#oiBuyer').textContent = (rec.buyerName || '—') + (rec.buyerId ? ' / ' + rec.buyerId : '');

      const hasOverAmt = (rec.overAmt || 0) > 0;
      this._q('#loanRow2').innerHTML = `
        <div class="order-info-item"><span class="oi-label">款項類別</span><span class="oi-value">${rec.category || '—'}</span></div>
        <div class="order-info-item"><span class="oi-label">貸款總額</span><span class="oi-value">NT$ ${fmt(rec.amount)} 元</span></div>
        <div class="order-info-item">
          <span class="oi-label">車貸金額${hasOverAmt ? ' / 超貸金額' : ''}</span>
          <span class="oi-value oi-amount">NT$ ${fmt(rec.carAmt)} 元${hasOverAmt ? ' <span style="color:#854F0B;font-size:11px;font-weight:400">/ ' + fmt(rec.overAmt) + ' 元</span>' : ''}</span>
        </div>`;
      this._q('#loanRow3').innerHTML = `
        <div class="order-info-item"><span class="oi-label">放款機構</span><span class="oi-value">${rec.institution || '—'}</span></div>
        <div class="order-info-item"><span class="oi-label">期數</span><span class="oi-value">${rec.period ? rec.period + ' 期' : '—'}</span></div>
        <div class="order-info-item"><span class="oi-label">利率</span><span class="oi-value">${rec.rate ? rec.rate + ' %' : '—'}</span></div>`;

      this._q('#categoryDisplay').value = rec.category || '';
      this._q('#searchId').value = rec.buyerId || '';
    }

    _resetSearchUI() {
      this._q('#resultSection').style.display = 'none';
      this._q('#resultBody').innerHTML = '';
      this._q('#noMatch').style.display = 'none';
      this._q('#resultTable').style.display = '';
      this._q('#selectedSection').style.display = 'none';
      this._q('#allocInput').value = '';
      this._q('#remainInput').value = '';
      this._q('#allocErr').textContent = '';
      this._q('#allocBox').classList.remove('err-box');
      this._q('#allocAll').checked = true;
      this._q('#btnSave').disabled = true;
    }

    // 之後接 API：把這個函式換成 fetch 呼叫即可，回傳格式維持一致(陣列)
    _searchWireRecords(carAmt, payerId) {
      return this._wireData.filter((r) => {
        const amtOk = r.total >= carAmt;
        const idOk = !payerId || r.payerId === payerId;
        return amtOk && idOk;
      });
    }

    _doSearch() {
      const carAmt = this._record.carAmt || this._record.amount || 0;
      this._q('#carAmtHint').textContent = fmt(carAmt);
      this._q('#noMatchAmt').textContent = fmt(carAmt);
      this._q('#resultSection').style.display = 'block';
      this._selectedId = null;
      this._q('#btnSave').disabled = true;
      this._renderResult();
    }

    _renderResult() {
      const carAmt = this._record.carAmt || this._record.amount || 0;
      const payerId = this._q('#searchId').value.trim();
      const matched = this._searchWireRecords(carAmt, payerId);
      const noMatch = this._q('#noMatch');
      const tbl = this._q('#resultTable');

      if (!matched.length) {
        tbl.style.display = 'none';
        noMatch.style.display = 'block';
        this._q('#resultBody').innerHTML = '';
        return;
      }
      tbl.style.display = '';
      noMatch.style.display = 'none';

      this._q('#resultBody').innerHTML = matched.map((r) => {
        const isSel = this._selectedId === r.id;
        return `<tr class="${isSel ? 'selected' : ''}">
          <td><button class="btn-sel${isSel ? ' active' : ''}" data-id="${r.id}">${isSel ? '已選' : '選擇'}</button></td>
          <td>${r.date}</td><td>${r.seq}</td>
          <td style="text-align:right">${fmt(r.total)}</td>
          <td>${r.bank}</td><td>${r.last5}</td><td>${r.name}</td>
        </tr>`;
      }).join('');

      this._q('#resultBody').querySelectorAll('.btn-sel').forEach((btn) => {
        btn.addEventListener('click', () => this._selectWire(btn.dataset.id));
      });
    }

    _selectWire(id) {
      this._selectedId = id;
      this._detailOpen = false;
      this._renderResult();

      const r = this._wireData.find((x) => x.id === id);
      const avail = r.total - r.allocated;
      this._q('#selDate').textContent = r.date;
      this._q('#selSeq').textContent = r.seq;
      this._q('#selTotal').textContent = fmt(r.total);
      this._q('#selAllocatedVal').textContent = fmt(r.allocated);
      this._q('#selAvail').textContent = fmt(avail);

      const hasDetails = r.details && r.details.length > 0;
      this._q('#detailList').innerHTML = hasDetails
        ? r.details.map((d) => `<div class="detail-chip"><span class="chip-order">${d.order}</span><span>${fmt(d.amt)} 元</span></div>`).join('')
        : '';
      const btnDetail = this._q('#btnDetail');
      const detailInner = this._q('#detailInner');
      if (hasDetails) {
        this._detailOpen = true;
        btnDetail.style.display = '';
        detailInner.classList.add('open');
        btnDetail.classList.add('open');
        btnDetail.textContent = '收起';
      } else {
        this._detailOpen = false;
        btnDetail.style.display = 'none';
        detailInner.classList.remove('open');
        btnDetail.classList.remove('open');
        btnDetail.textContent = '明細';
      }

      this._q('#selectedSection').style.display = 'block';
      this._q('#allocAll').checked = true;
      this._onAllocAll(true);
    }

    _toggleDetail() {
      this._detailOpen = !this._detailOpen;
      this._q('#detailInner').classList.toggle('open', this._detailOpen);
      this._q('#btnDetail').classList.toggle('open', this._detailOpen);
      this._q('#btnDetail').textContent = this._detailOpen ? '收起' : '明細';
    }

    _onAllocAll(checked) {
      const inp = this._q('#allocInput');
      const remain = this._q('#remainInput');
      if (checked && this._selectedId) {
        const r = this._wireData.find((x) => x.id === this._selectedId);
        const avail = r.total - r.allocated;
        inp.value = avail;
        inp.disabled = true;
        remain.value = '0';
        this._q('#allocErr').textContent = '';
        this._q('#allocBox').classList.remove('err-box');
      } else {
        inp.value = '';
        inp.disabled = false;
        remain.value = '';
      }
      this._updateSaveBtn();
    }

    _onAllocInput(val) {
      if (!this._selectedId) return;
      const r = this._wireData.find((x) => x.id === this._selectedId);
      const avail = r.total - r.allocated;
      const amt = parseInt(val) || 0;
      const errEl = this._q('#allocErr');
      const box = this._q('#allocBox');
      if (!val || val === '') {
        errEl.textContent = '';
        box.classList.remove('err-box');
        this._q('#remainInput').value = '';
      } else if (amt <= 0) {
        errEl.textContent = '請輸入大於 0 的金額';
        box.classList.add('err-box');
      } else if (amt > avail) {
        errEl.textContent = `可分配餘額 ${fmt(avail)} 元，不足本次分配`;
        box.classList.add('err-box');
        this._q('#remainInput').value = fmt(avail - amt);
      } else {
        errEl.textContent = '';
        box.classList.remove('err-box');
        this._q('#remainInput').value = fmt(avail - amt);
      }
      this._updateSaveBtn();
    }

    _updateSaveBtn() {
      const amt = parseInt(this._q('#allocInput').value) || 0;
      const hasErr = !!this._q('#allocErr').textContent;
      this._q('#btnSave').disabled = !(this._selectedId && amt > 0 && !hasErr);
    }

    _doSave() {
      const r = this._wireData.find((x) => x.id === this._selectedId);
      const amt = parseInt(this._q('#allocInput').value) || 0;
      if (!amt || !r) return;

      // 更新內部假資料的已分配金額（之後接 API 時，這裡改成等待後端回應）
      r.allocated += amt;
      r.details = r.details || [];
      r.details.push({ order: this._record.orderNo || '', amt });

      const detail = {
        wireSeq: r.seq,
        loanWireDate: r.date,
        loanWireTotal: r.total,
        loanBank: r.bank,
        loanLast5: r.last5,
        loanPayerName: r.name,
        loanWireAmt: amt,
      };

      this.close();
      this.dispatchEvent(new CustomEvent('loan-wire-confirmed', { detail, bubbles: true, composed: true }));
    }
  }

  customElements.define('loan-wire-popup', LoanWirePopup);
})();
