      // ===================================================================
      //  In-browser data layer — replaces the Express + SQLite backend so
      //  the page works standalone from file:// with no server. All data is
      //  persisted in localStorage and survives reloads (per browser).
      // ===================================================================
      const AIRCRAFT = {
        A359: { code:'A359', name:'Airbus A350-900',
          business:{rows:8,letters:'ABCDEFGH',startRow:1}, economy:{rows:18,letters:'ABCDEFGHI',startRow:11} },
        A332: { code:'A332', name:'Airbus A330-200',
          business:{rows:7,letters:'ABCDEFGH',startRow:1}, economy:{rows:24,letters:'ABCDEFGHI',startRow:11} },
        A320: { code:'A320', name:'Airbus A320-200',
          business:{rows:5,letters:'ABCDEF',startRow:1}, economy:{rows:30,letters:'ABCDEF',startRow:9} },
      };
      const AISLE_AFTER = { 9:['C','F'], 8:['B','F'], 6:['C'] };
      const SEAT_PRICE = { Economy:200, Business:500 };
      const EXTRA_BAG_CHARGE = 50;
      const AIRLINE_CODE = 'TK';

      function exitRowNumbers(cabin){
        const mid = Math.floor(cabin.rows/2);
        return [cabin.startRow+mid-1, cabin.startRow+mid];
      }
      function buildCabin(cabin, cabinClass){
        const letters = cabin.letters.split('');
        const aisleAfter = AISLE_AFTER[letters.length] || [];
        const exitRows = cabinClass==='Economy' ? exitRowNumbers(cabin) : [];
        const rows = [];
        for (let i=0;i<cabin.rows;i++){
          const rowNum = cabin.startRow+i;
          const isExit = exitRows.includes(rowNum);
          const seats = letters.map(letter => ({
            id: rowNum+letter, row: rowNum, letter, cabin: cabinClass,
            isExit, aisleAfter: aisleAfter.includes(letter),
          }));
          rows.push({ row: rowNum, isExit, seats });
        }
        return rows;
      }
      function getSeatMap(type){
        const cfg = AIRCRAFT[type]; if(!cfg) return null;
        return { code:cfg.code, name:cfg.name,
          business: buildCabin(cfg.business,'Business'),
          economy: buildCabin(cfg.economy,'Economy') };
      }
      function getCapacity(type){
        const c = AIRCRAFT[type]; if(!c) return 0;
        return c.business.rows*c.business.letters.length + c.economy.rows*c.economy.letters.length;
      }
      function getAllSeats(type){
        const m = getSeatMap(type); if(!m) return [];
        const out=[]; ['business','economy'].forEach(s=>m[s].forEach(r=>r.seats.forEach(x=>out.push(x)))); return out;
      }
      function isExitSeat(type, seatId){
        const s = getAllSeats(type).find(x=>x.id===seatId); return s? s.isExit : false;
      }

      // ----- helpers shared with the boarding-pass barcode (BCBP) -----
      function nowISO(){ return new Date().toISOString(); }
      function makeBookingRef(){
        const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r='';
        for(let i=0;i<6;i++) r+=chars[Math.floor(Math.random()*chars.length)];
        return r;
      }
      function julianOf(dateStr){
        const d = dateStr ? new Date(dateStr) : new Date();
        const start = new Date(d.getFullYear(),0,0);
        return String(Math.floor((d-start)/86400000)).padStart(3,'0');
      }
      function cabinLetterOf(c){ return c==='Business' ? 'J' : 'Y'; }
      function padS(s,n){ return String(s==null?'':s).slice(0,n).padEnd(n,' '); }
      function padN(n,len){ return String(n==null?'':n).replace(/\D/g,'').slice(-len).padStart(len,'0'); }
      function encodeSeat(seat){
        if(!seat) return '0000';
        const m = String(seat).match(/^(\d+)([A-Z])$/i);
        if(!m) return padS(seat,4);
        return padN(m[1],3)+m[2].toUpperCase();
      }
      function buildBCBP(d){
        const name = ((d.lastName||'')+'/'+(d.firstName||'')).toUpperCase();
        return 'M1'+padS(name,20)+'E'+padS(d.bookingReference,7)+
          padS(d.departure,3).toUpperCase()+padS(d.arrival,3).toUpperCase()+
          padS(AIRLINE_CODE,2)+padN(d.flightNumber,4)+julianOf(d.departureTime)+
          cabinLetterOf(d.cabinClass)+encodeSeat(d.seatAssigned)+padN(d.sequence||0,4);
      }
      function parseBCBP(raw){
        const s = String(raw||'');
        if(s.length<54 || s.slice(0,1).toUpperCase()!=='M') return null;
        try {
          const name = s.slice(2,22).trim();
          const parts = name.split('/');
          return {
            name, lastName: parts[0]||'', firstName: parts[1]||'',
            bookingReference: s.slice(23,30).trim(),
            departure: s.slice(30,33).trim(), arrival: s.slice(33,36).trim(),
            carrier: s.slice(36,38).trim(), flightNumber: s.slice(38,42).replace(/^0+/,''),
            julian: s.slice(42,45).trim(), cabin: s.slice(45,46).trim(),
            seat: s.slice(46,50).replace(/^0+/,'').trim(), sequence: parseInt(s.slice(50,54),10)||0,
          };
        } catch(e){ return null; }
      }

      // ----- persistence -----
      const DB_KEY = 'tkpms_db_v1';
      function nextId(coll){ DB._seq[coll]=(DB._seq[coll]||0)+1; return DB._seq[coll]; }
      function saveDB(){ try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch(e){} }
      function freshDB(){
        return { _seq:{}, flights:[], passengers:[], bookings:[], baggage:[], checkin:[], boarding:[] };
      }
      function seedDB(){
        DB = freshDB();
        const samples = [
          { flightNumber:'TK1', departure:'IST', arrival:'JFK', aircraftType:'A359', depOffsetH:3, durH:11 },
          { flightNumber:'TK79', departure:'IST', arrival:'LAX', aircraftType:'A332', depOffsetH:5, durH:14 },
          { flightNumber:'TK1985', departure:'IST', arrival:'LHR', aircraftType:'A320', depOffsetH:2, durH:4 },
        ];
        samples.forEach(f => {
          const dep = new Date(Date.now()+f.depOffsetH*3600000);
          const arr = new Date(dep.getTime()+f.durH*3600000);
          DB.flights.push({ id:nextId('flights'), flightNumber:f.flightNumber, departure:f.departure,
            arrival:f.arrival, departureTime:dep.toISOString().slice(0,16), arrivalTime:arr.toISOString().slice(0,16),
            aircraftType:f.aircraftType, status:'Scheduled', createdAt:nowISO() });
        });
        const first = DB.flights[0];
        const pid = nextId('passengers');
        DB.passengers.push({ id:pid, flightId:first.id, firstName:'John', lastName:'Doe',
          email:'john.doe@example.com', phone:'+1 555 0100', passportNumber:'U12345678',
          dateOfBirth:'1985-06-15', nationality:'USA', createdAt:nowISO() });
        DB.bookings.push({ id:nextId('bookings'), passengerId:pid, flightId:first.id, seatAssigned:'12A',
          cabinClass:'Economy', bookingReference:'TKDEMO', paxSeq:1, paymentMethod:'credit_card', paymentAmount:200,
          paymentStatus:'paid', createdAt:nowISO() });
        saveDB();
        return DB;
      }
      let DB;
      (function loadDB(){
        try { const r = JSON.parse(localStorage.getItem(DB_KEY)); if(r && r.flights){ DB = r; return; } } catch(e){}
        seedDB();
      })();

      const byId = (arr,id) => arr.find(x=>String(x.id)===String(id));

      function getBookingFull(bookingId){
        const b = byId(DB.bookings, bookingId); if(!b) return null;
        const p = byId(DB.passengers, b.passengerId) || {};
        const f = byId(DB.flights, b.flightId) || {};
        const c = DB.checkin.find(x=>String(x.bookingId)===String(b.id));
        const bo = DB.boarding.find(x=>String(x.bookingId)===String(b.id));
        const bags = DB.baggage.filter(x=>String(x.bookingId)===String(b.id));
        const row = {
          id:b.id, passengerId:b.passengerId, flightId:b.flightId, seatAssigned:b.seatAssigned,
          cabinClass:b.cabinClass, bookingReference:b.bookingReference, paxSeq:b.paxSeq||1,
          paymentMethod:b.paymentMethod,
          paymentAmount:b.paymentAmount, paymentStatus:b.paymentStatus, createdAt:b.createdAt,
          firstName:p.firstName, lastName:p.lastName, email:p.email, phone:p.phone,
          passportNumber:p.passportNumber, dateOfBirth:p.dateOfBirth, nationality:p.nationality,
          flightNumber:f.flightNumber, departure:f.departure, arrival:f.arrival,
          departureTime:f.departureTime, arrivalTime:f.arrivalTime, aircraftType:f.aircraftType,
          flightStatus:f.status,
          checkedInTime: c?c.checkedInTime:null, sequence: c?c.sequence:null,
          apisData: c?c.apisData:null, checkinBagCount: c?c.bagCount:0,
          boardingPassPrinted: c?c.boardingPassPrinted:0,
          boardedTime: bo?bo.boardedTime:null, boardingSequence: bo?bo.sequence:null,
        };
        row.isExitSeat = isExitSeat(row.aircraftType, row.seatAssigned);
        row.bcbp = buildBCBP(row);
        row.scanCode = String(row.bookingReference) + String(row.paxSeq || 1);
        row.baggage = bags;
        return row;
      }

      // Resolve a scanned/typed code to a PNR + optional specific passenger.
      function resolveCode(raw){
        const s = String(raw||'').trim();
        if(!s) return null;
        const parsed = parseBCBP(s);
        if(parsed && parsed.bookingReference)
          return { ref:parsed.bookingReference.toUpperCase(), seat:parsed.seat||null, paxSeq:null };
        const up = s.toUpperCase();
        if(up.length>6){
          const tail = up.slice(6);
          return { ref:up.slice(0,6), seat:null, paxSeq:/^\d+$/.test(tail)?parseInt(tail,10):null };
        }
        return { ref:up, seat:null, paxSeq:null };
      }
      function getGroup(ref){
        return DB.bookings.filter(b=>b.bookingReference===ref)
          .sort((a,b)=>(a.paxSeq||1)-(b.paxSeq||1)).map(b=>getBookingFull(b.id));
      }

      // ----- API dispatcher (same call signatures the UI already uses) -----
      async function api(path, opts = {}) {
        const method = (opts.method || 'GET').toUpperCase();
        const data = opts.body || {};
        const qi = path.indexOf('?');
        const pure = qi >= 0 ? path.slice(0, qi) : path;
        const query = Object.fromEntries(new URLSearchParams(qi >= 0 ? path.slice(qi + 1) : ''));
        const parts = pure.split('/').filter(Boolean);

        // ---- auth ----
        if (pure === '/login' && method === 'POST') {
          const u = (data.username || '').trim();
          if ((u === 'danilb' || u === 'danilb@heyvacay.co') && data.password === '20100603')
            return { ok:true, username:'danilb' };
          throw new Error('Invalid credentials');
        }

        // ---- aircraft ----
        if (pure === '/aircraft') {
          const out = {};
          Object.keys(AIRCRAFT).forEach(code => {
            out[code] = { code, name: AIRCRAFT[code].name, capacity: getCapacity(code), seatMap: getSeatMap(code) };
          });
          return out;
        }

        // ---- flights ----
        if (pure === '/flights' && method === 'GET') {
          return DB.flights.slice().sort((a,b)=>String(a.departureTime).localeCompare(String(b.departureTime)))
            .map(f => ({ ...f, capacity:getCapacity(f.aircraftType),
              booked: DB.bookings.filter(x=>String(x.flightId)===String(f.id)).length }));
        }
        if (pure === '/flights' && method === 'POST') {
          const r = data;
          if (!r.flightNumber||!r.departure||!r.arrival||!r.departureTime||!r.arrivalTime||!r.aircraftType)
            throw new Error('All flight fields are required');
          if (!AIRCRAFT[r.aircraftType]) throw new Error('Unknown aircraft type');
          const f = { id:nextId('flights'), flightNumber:r.flightNumber.toUpperCase(),
            departure:r.departure.toUpperCase(), arrival:r.arrival.toUpperCase(),
            departureTime:r.departureTime, arrivalTime:r.arrivalTime, aircraftType:r.aircraftType,
            status:'Scheduled', createdAt:nowISO() };
          DB.flights.push(f); saveDB(); return f;
        }
        if (parts[0]==='flights' && parts[1] && method==='GET') {
          const flight = byId(DB.flights, parts[1]); if(!flight) throw new Error('Flight not found');
          const bookings = DB.bookings.filter(b=>String(b.flightId)===String(flight.id)).map(b=>{
            const full = getBookingFull(b.id);
            return { ...b, firstName:full.firstName, lastName:full.lastName, email:full.email,
              phone:full.phone, passportNumber:full.passportNumber, nationality:full.nationality,
              dateOfBirth:full.dateOfBirth, checkedInTime:full.checkedInTime, checkinSequence:full.sequence,
              boardedTime:full.boardedTime };
          }).sort((a,b)=>String(a.cabinClass+a.seatAssigned).localeCompare(String(b.cabinClass+b.seatAssigned)));
          return { flight:{ ...flight, capacity:getCapacity(flight.aircraftType), booked:bookings.length },
            seatMap:getSeatMap(flight.aircraftType), bookings };
        }
        if (parts[0]==='flights' && parts[1] && method==='PUT') {
          const flight = byId(DB.flights, parts[1]); if(!flight) throw new Error('Flight not found');
          Object.assign(flight, {
            flightNumber:String(data.flightNumber!=null?data.flightNumber:flight.flightNumber).toUpperCase(),
            departure:String(data.departure!=null?data.departure:flight.departure).toUpperCase(),
            arrival:String(data.arrival!=null?data.arrival:flight.arrival).toUpperCase(),
            departureTime:data.departureTime!=null?data.departureTime:flight.departureTime,
            arrivalTime:data.arrivalTime!=null?data.arrivalTime:flight.arrivalTime,
            aircraftType:data.aircraftType!=null?data.aircraftType:flight.aircraftType,
            status:data.status!=null?data.status:flight.status,
          });
          saveDB(); return flight;
        }
        if (parts[0]==='flights' && parts[1] && method==='DELETE') {
          const fid = parts[1];
          const bids = DB.bookings.filter(b=>String(b.flightId)===String(fid)).map(b=>b.id);
          DB.baggage = DB.baggage.filter(x=>!bids.includes(x.bookingId));
          DB.checkin = DB.checkin.filter(x=>!bids.includes(x.bookingId));
          DB.boarding = DB.boarding.filter(x=>!bids.includes(x.bookingId));
          DB.bookings = DB.bookings.filter(b=>String(b.flightId)!==String(fid));
          DB.passengers = DB.passengers.filter(p=>String(p.flightId)!==String(fid));
          DB.flights = DB.flights.filter(f=>String(f.id)!==String(fid));
          saveDB(); return { ok:true };
        }

        // ---- bookings (one PNR, one or more passengers) ----
        if (pure === '/bookings' && method === 'POST') {
          const flight = byId(DB.flights, data.flightId); if(!flight) throw new Error('Flight not found');
          let passengers = Array.isArray(data.passengers) ? data.passengers : [{
            firstName:data.firstName, lastName:data.lastName, email:data.email, phone:data.phone,
            cabinClass:data.cabinClass, seatAssigned:data.seatAssigned }];
          if (!passengers.length) throw new Error('At least one passenger is required');
          const seen = new Set();
          passengers.forEach(p => {
            if(!p.firstName||!p.lastName||!p.cabinClass||!p.seatAssigned)
              throw new Error('Each passenger needs a name, cabin class and seat');
            const seatDef = getAllSeats(flight.aircraftType).find(s=>s.id===p.seatAssigned);
            if(!seatDef) throw new Error('Invalid seat '+p.seatAssigned);
            if(seatDef.cabin!==p.cabinClass) throw new Error('Seat '+p.seatAssigned+' is not in '+p.cabinClass+' cabin');
            if(seen.has(p.seatAssigned)) throw new Error('Duplicate seat '+p.seatAssigned+' in this booking');
            seen.add(p.seatAssigned);
            if(DB.bookings.find(b=>String(b.flightId)===String(data.flightId)&&b.seatAssigned===p.seatAssigned))
              throw new Error('Seat '+p.seatAssigned+' already booked');
          });
          let ref;
          for(let i=0;i<20;i++){ ref=makeBookingRef(); if(!DB.bookings.find(b=>b.bookingReference===ref)) break; }
          const ids=[]; let seq=1;
          passengers.forEach(p => {
            const pid = nextId('passengers');
            DB.passengers.push({ id:pid, flightId:data.flightId, firstName:p.firstName, lastName:p.lastName,
              email:p.email||'', phone:p.phone||'', passportNumber:p.passportNumber||'',
              dateOfBirth:p.dateOfBirth||'', nationality:p.nationality||'', createdAt:nowISO() });
            const bk = { id:nextId('bookings'), passengerId:pid, flightId:data.flightId, seatAssigned:p.seatAssigned,
              cabinClass:p.cabinClass, bookingReference:ref, paxSeq:seq, paymentMethod:data.paymentMethod||'cash',
              paymentAmount:SEAT_PRICE[p.cabinClass]||0, paymentStatus:'paid', createdAt:nowISO() };
            DB.bookings.push(bk); ids.push(bk.id); seq++;
          });
          saveDB();
          const fullList = ids.map(id=>getBookingFull(id));
          return { bookingReference:ref, flightId:data.flightId,
            totalAmount: fullList.reduce((s,b)=>s+(b.paymentAmount||0),0), passengers:fullList };
        }
        if (pure === '/bookings' && method === 'GET') {
          let rows = DB.bookings.slice();
          if (query.flightId) rows = rows.filter(b=>String(b.flightId)===String(query.flightId));
          return rows.map(b=>{ const f=byId(DB.flights,b.flightId)||{}; const p=byId(DB.passengers,b.passengerId)||{};
            return { ...b, firstName:p.firstName, lastName:p.lastName, flightNumber:f.flightNumber,
              departure:f.departure, arrival:f.arrival }; })
            .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
        }

        // ---- lookup (PNR, short scan code, or scanned BCBP) -> PNR group ----
        if (pure === '/lookup') {
          const raw = String(query.code||'').trim();
          if (!raw) throw new Error('No lookup code provided');
          const resolved = resolveCode(raw);
          const passengers = getGroup(resolved.ref);
          if (!passengers.length) throw new Error('No booking for "'+resolved.ref+'"');
          let selected = null;
          if (resolved.seat) selected = passengers.findIndex(p=>p.seatAssigned===resolved.seat);
          else if (resolved.paxSeq) selected = passengers.findIndex(p=>p.paxSeq===resolved.paxSeq);
          if (selected === -1) selected = null;
          return { bookingReference:resolved.ref, flightId:passengers[0].flightId, passengers, selected };
        }

        // ---- baggage ----
        if (pure === '/baggage' && method === 'POST') {
          if (!data.bookingId) throw new Error('bookingId required');
          if (!byId(DB.bookings, data.bookingId)) throw new Error('Booking not found');
          const tagSeq = DB.baggage.length + 1;
          const bag = { id:nextId('baggage'), bookingId:data.bookingId, bagCount:1,
            weight:data.weight||null, dimensions:data.dimensions||'',
            extraCharge:data.charge?EXTRA_BAG_CHARGE:0,
            bagTagNumber: AIRLINE_CODE+String(tagSeq).padStart(6,'0'), createdAt:nowISO() };
          DB.baggage.push(bag); saveDB(); return bag;
        }
        if (parts[0]==='baggage' && parts[1] && method==='DELETE') {
          DB.baggage = DB.baggage.filter(x=>String(x.id)!==String(parts[1])); saveDB(); return { ok:true };
        }

        // ---- check-in ----
        if (pure === '/checkin' && method === 'POST') {
          const b = byId(DB.bookings, data.bookingId); if(!b) throw new Error('Booking not found');
          if (data.apisData) {
            const p = byId(DB.passengers, b.passengerId);
            if (p) { p.passportNumber=data.apisData.passportNumber||''; p.dateOfBirth=data.apisData.dateOfBirth||'';
              p.nationality=data.apisData.nationality||''; }
          }
          const bagCount = DB.baggage.filter(x=>String(x.bookingId)===String(b.id)).length;
          const apisSf = 'SF'+Math.random().toString(16).slice(2,10).toUpperCase();
          let c = DB.checkin.find(x=>String(x.bookingId)===String(b.id));
          if (c) {
            c.checkedInTime=nowISO(); c.bagCount=bagCount; c.apisData=JSON.stringify(data.apisData||{});
            c.apisSfNumber=apisSf; c.boardingPassPrinted=1;
          } else {
            const seq = DB.checkin.filter(x=>{ const bb=byId(DB.bookings,x.bookingId); return bb&&String(bb.flightId)===String(b.flightId); }).length + 1;
            DB.checkin.push({ id:nextId('checkin'), bookingId:b.id, checkedInTime:nowISO(), bagCount,
              apisData:JSON.stringify(data.apisData||{}), apisSfNumber:apisSf, boardingPassPrinted:1,
              sequence:seq, createdAt:nowISO() });
          }
          saveDB(); return getBookingFull(b.id);
        }

        // ---- boarding ----
        if (pure === '/boarding/scan' && method === 'POST') {
          const raw = String(data.code||'').trim();
          if (!raw) return { status:'error', reason:'No barcode scanned' };
          const resolved = resolveCode(raw);
          const group = getGroup(resolved.ref);
          if (!group.length) return { status:'error', reason:'Unknown boarding pass ('+resolved.ref+')' };
          let booking = null;
          if (resolved.seat) booking = group.find(p=>p.seatAssigned===resolved.seat);
          else if (resolved.paxSeq) booking = group.find(p=>p.paxSeq===resolved.paxSeq);
          else if (group.length===1) booking = group[0];
          if (!booking) return { status:'error',
            reason:'PNR '+resolved.ref+' has '+group.length+' passengers — scan the individual boarding pass' };
          if (!booking.checkedInTime) return { status:'error', reason:'Passenger is NOT checked in', booking };
          if (data.flightId && Number(data.flightId)!==Number(booking.flightId))
            return { status:'error', reason:'Wrong flight (pass is for '+booking.flightNumber+')', booking };
          if (DB.boarding.find(x=>String(x.bookingId)===String(booking.id)))
            return { status:'error', reason:'Already boarded', booking };
          const seq = DB.boarding.filter(x=>String(x.flightId)===String(booking.flightId)).length + 1;
          DB.boarding.push({ id:nextId('boarding'), bookingId:booking.id, flightId:booking.flightId, boardedTime:nowISO(), sequence:seq });
          saveDB();
          booking.boardingSequence=seq; booking.boardedTime=nowISO();
          return { status: booking.isExitSeat?'exit':'ok', booking, sequence:seq };
        }
        if (pure === '/boarding' && method === 'GET') {
          let rows = DB.boarding.slice();
          if (query.flightId) rows = rows.filter(x=>String(x.flightId)===String(query.flightId));
          return rows.sort((a,b)=>a.sequence-b.sequence).map(bo=>{
            const b=byId(DB.bookings,bo.bookingId)||{}; const p=byId(DB.passengers,b.passengerId)||{}; const f=byId(DB.flights,bo.flightId)||{};
            return { ...bo, bookingReference:b.bookingReference, seatAssigned:b.seatAssigned, cabinClass:b.cabinClass,
              firstName:p.firstName, lastName:p.lastName, flightNumber:f.flightNumber, aircraftType:f.aircraftType,
              isExitSeat:isExitSeat(f.aircraftType,b.seatAssigned) };
          });
        }

        throw new Error('Unknown route: '+method+' '+pure);
      }
