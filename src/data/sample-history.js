window.__SAMPLE_HISTORY__ = String.raw`	*****************************************************
	*		 HISTÓRICO DE PLANOS                *
	*                                                   *
	*  Data: 06/06/26		 Hora 21:41:09      *
	*                                                   *
	*  Indicativo do plano: TAM3542  Número: 465        *
	*  ADEP: SBBR      DOF: 260606   EOBT: 1840         *
	*****************************************************

############################################################

OPERAÇÃO : Criação pelo Arquivo de RPL

data:   06/06/2026      hora:   15:00:59      posição: SPA01      ambiente: OpA

BDS:	ACCBS71U
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Indicativo   : TAM3542    Número de aeronaves : 1        Tipo de voo : S
Regra de voo : I          Tipo de aeronave    : A321     ADES        : SBGO 
Equip. aux.  : SWDE2FGHIM1RXYZ                           ADEP        : SBBR 
Equip. vig.  : C                                         Velocidade  : N0400
Data do voo  : 260606     Dia da Semana       : SAB      EOBT        : 1840 
Turbulência  : M          Tipo de Plano       : RPL      EET         : 0025 
Aeród. alt1. :            Aeród. alt2.        :          Nível       : F160  
Código SSR solicitado :        alocado :      
Rota         : SIREM
Observação   : PBN/A1B1C1D1L1O2S2 DAT/SV RMK/TCAS
SID         : 
STAR        : 
ETB     ETN    FIRN    FIRX    IFL    CFL     BPN           BPX    
        1840                          160     SBBR          SBGO        

TRECHOS:     BR    AN
Posição:    AUT   AUT
PrimPto:      0     2

PONTOS : SBBR        UMSUB       SIREM       SBGO        
CFL/IFL: 160         160         160         160         
ETIM   : 06-18:40    06-18:46    06-18:50    06-18:56    

Sobrevoo Sem Pouso dentro dos limites da FIR: NÃO

############################################################

OPERAÇÃO : Evento de Transição de Estados de Autorização

data:   06/06/2026      hora:   15:00:59      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Estado atual: Aguardando Autorização


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   15:00:59      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(FPL-TAM3542-IS

-A321/M-SWDE2FGHIM1RXYZ/C

-SBBR1840

-N0400F160 SIREM

-SBGO0025

-PBN/A1B1C1D1L1O2S2 DAT/SV RMK/TCAS DOF/260606)
############################################################

OPERAÇÃO : Recepção de Mensagem ATS

data:   06/06/2026      hora:   15:04:12      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBRJZPZX
Destinatários    : SBBSZQZX	
Número           : -1      Referência       : -1       FT : 061504 
Data de Recepção : 06/06/2026 15:04:11
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE ACK -MSGTYP FPL -ORIGINDT 2606061501 -BEGIN ADDR -FAC SBRJZPZX -END ADDR -COMMENT AUTO  -IDPLANO NZQ132ME -BEGIN MSGSUM -ARCID TAM3542 -ADEP SBBR -ADES SBGO -EOBT 1840 -EOBD 260606 -END MSGSUM
############################################################

OPERAÇÃO : Recepção de Mensagem DLA

data:   06/06/2026      hora:   17:38:31      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBRJZPZX
Destinatários    : SBBSZQZX	
Número           : -1      Referência       : -1       FT : 061738 
Data de Recepção : 06/06/2026 17:38:30
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
(DLA-TAM3542-SBBR1926-SBGO-DOF/260606 ORGN/SBSPSIGX RMK/IDPLANO NZQ132ME)

############################################################

OPERAÇÃO : Atualização de Estimados

data:   06/06/2026      hora:   17:38:31      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

PONTOS : SBBR        UMSUB       SIREM       SBGO        
ETIM   : 06-19:26    06-19:32    06-19:36    06-19:42    
CFL    : 160         160         160         160         

MOTIVO : Tratamento de Mensagem DLA

Nível Autorizado: 160

Ponto de Autorização: SBBR

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   17:38:31      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP DLA
-ORIGINDT 2606061738
-FILTIM 061738
-BEGIN ADDR
 -FAC SBBSZQZX
-END ADDR
-IDPLANO NZQ132ME
-COMMENT AUTO
-BEGIN MSGSUM
 -ARCID TAM3542
 -ADEP SBBR
 -ADES SBGO
 -EOBT 1926
 -EOBD 260606
-END MSGSUM
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   17:38:31      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP CHG
-BEGIN ADDR
 -FAC SBBSZQZX
-END ADDR
-IDPLANO NZQ132ME
-COMMENT ALTER
-MSGTXT (FPL-TAM3542-IS

-A321/M-SWDE2FGHIM1RXYZ/C

-SBBR1926

-N0400F160 SIREM

-SBGO0025

-PBN/A1B1C1D1L1O2S2 DAT/SV RMK/IDPLANO NZQ132ME TCAS)
############################################################

OPERAÇÃO : Modificação pelo Operador PLN

data:   06/06/2026      hora:   18:46:20      posição: PLN02      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Indicativo   : TAM3542    Número de aeronaves : 1        Tipo de voo : S
Regra de voo : I          Tipo de aeronave    : A321     ADES        : SBGO 
Equip. aux.  : SWDE2FGHIM1RXYZ                           ADEP        : SBBR 
Equip. vig.  : C                                         Velocidade  : N0400
Data do voo  : 260606     Dia da Semana       : SAB      EOBT        : 1845 
Turbulência  : M          Tipo de Plano       : RPL      EET         : 0025 
Aeród. alt1. :            Aeród. alt2.        :          Nível       : F160  
Código SSR solicitado :        alocado :      
Rota         : SIREM
Observação   : PBN/A1B1C1D1L1O2S2 DAT/SV RMK/TCAS
SID         : 
STAR        : 
IDPLANO     : NZQ132ME
ETB     ETN    FIRN    FIRX    IFL    CFL     BPN           BPX    
        1845                          160     SBBR          SBGO        

TRECHOS:     BR    AN
Posição:    AUT   AUT
PrimPto:      0     2

PONTOS : SBBR        UMSUB       SIREM       SBGO        
CFL/IFL: 160         160         160         160         
ETIM   : 06-18:45    06-18:51    06-18:55    06-19:01    

Sobrevoo Sem Pouso dentro dos limites da FIR: NÃO

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:46:20      posição: SPA01      ambiente: OpA
Estado: INA Setor anterior:  NUL NUL  atual:  NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP CHG
-BEGIN ADDR
 -FAC SBBSZQZX
-END ADDR
-IDPLANO NZQ132ME
-COMMENT ALTER
-MSGTXT (FPL-TAM3542-IS

-A321/M-SWDE2FGHIM1RXYZ/C

-SBBR1845

-N0400F160 SIREM

-SBGO0025

-PBN/A1B1C1D1L1O2S2 DAT/SV RMK/IDPLANO NZQ132ME TCAS)
############################################################

OPERAÇÃO : Evento Automático de Pré-Ativação

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Alocado código SSR: 4651

############################################################

OPERAÇÃO : Evento de Transição de Estados de Autorização

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Aguardando Autorização
Estado atual: Pré Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem TTY

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZXCS	
Mensagem enviada : SIM
Conteúdo         : 
(FPVD     TAM3542   4651 A321M N0400 SBBR 1845 SBGO

SIREM 1855 F160                             RMK/W TCAS           

                                         

EQPT/SWDE2FGHIM1RXYZ PBN/A1B1C1D1L1O2S2 RMK/IDPLANO NZQ132ME

RTE/SIREM)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ACT

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACT -REFDATA -SENDER -FAC SBBSZQZX -RECVR -FAC SBRJZPZX -SEQNUM 975 -ARCID TAM3542 -SSRCODE A4651 -ADEP SBBR -EOBD 260606 -EOBT 1845 -BEGIN EQCST -EQPT S/EQ -EQPT W/EQ -EQPT D/EQ -EQPT E2/EQ -EQPT F/EQ -EQPT G/EQ -EQPT H/EQ -EQPT I/EQ -EQPT M1/EQ -EQPT R/EQ -EQPT X/EQ -EQPT Y/EQ -EQPT Z/EQ -END EQCST -ADES SBGO -FLTTYP S -ROUTE SIREM -FLTRUL I -TIMESTAMP 260606184652
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ADEXP

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ABI
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 929
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-ADES SBGO
-ARCTYP A321
-FLTTYP S
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-TTLEET 0025
-RMK TCAS
-IDPLANO NZQ132ME
-TIMESTAMP 260606184652
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:46:52      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP FPL
-ORIGINDT 2606061846
-BEGIN ADDR
 -FAC SBBRZXCS
-END ADDR
-IDPLANO NZQ132ME
-COMMENT AUTO
-BEGIN MSGSUM
 -ARCID TAM3542
 -ADEP SBBR
 -ADES SBGO
 -EOBT 1845
 -EOBD 260606
-END MSGSUM
############################################################

OPERAÇÃO : Recepção de Mensagem LAM

data:   06/06/2026      hora:   18:47:04      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 18:47:03
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE LAM
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 818
-MSGREF
     -SENDER
     -FAC SBBSZQZX
     -RECVR
     -FAC SBBRZTZX
     -SEQNUM 929
-TIMESTAMP 260606184659

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:47:04      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP FPL
-ORIGINDT 2606061846
-BEGIN ADDR
 -FAC SBBRZTZX
-END ADDR
-IDPLANO NZQ132ME
-BEGIN MSGSUM
 -ARCID TAM3542
 -ADEP SBBR
 -ADES SBGO
 -EOBT 1845
 -EOBD 260606
-END MSGSUM
############################################################

OPERAÇÃO : Recepção de Mensagem CRQ

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 18:47:29
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE CRQ
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 819
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-ETOT 1845
-RWYDEP 11R
-REG PRXBX
-PROPFL
     -TFL F160
-SID UMSUB1A SIREM
-IDPLANO NZQ132ME
-TIMESTAMP 260606184725

############################################################

OPERAÇÃO : Evento de Transição de Estados de Autorização

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Pré Autorizado
Estado atual: Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE SBY
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 947
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 819
-TIMESTAMP 260606184729
############################################################

OPERAÇÃO : Envio de Mensagem CRP

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE CRP
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 948
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-ETOT 1845
-RWYDEP 11R
-SID UMSUB1A SIREM
-IDPLANO NZQ132ME
-TIMESTAMP 260606184729
############################################################

OPERAÇÃO : Evento Automático de Envio de Copia Mensagem

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZXCS	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZXCS
 -SEQNUM 949
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-ETOT 1845
-RWYDEP 11R
-SID UMSUB1A SIREM
-IDPLANO NZQ132ME
-MSGTYP CRP
-TIMESTAMP 260606184729
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem TTY

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZXCS	
Mensagem enviada : SIM
Conteúdo         : 
(FPVD/CHG TAM3542   4651 A321M N0400 SBBR 1845 SBGO

SIREM 1855 F160                             RMK/W TCAS           

    UMSUB1A SIREM                        

EQPT/SWDE2FGHIM1RXYZ PBN/A1B1C1D1L1O2S2 REG/PRXBX RMK/IDPLANO NZQ132ME

RTE/SIREM)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 950
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-ETOT 1845
-RWYDEP 11R
-SID UMSUB1A SIREM
-IDPLANO NZQ132ME
-MSGTYP CRP
-TIMESTAMP 260606184729
############################################################

OPERAÇÃO : Recepção de Mensagem LAM

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZXCS
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 18:47:29
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBRZXCS
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 214
-MSGREF
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZXCS
 -SEQNUM 949
-TIMESTAMP 260606184729
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:47:29      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ACK
-MSGTYP CHG
-ORIGINDT 2606061847
-BEGIN ADDR
 -FAC SBBRZXCS
-END ADDR
-IDPLANO NZQ132ME
-COMMENT AUTO
-BEGIN MSGSUM
 -ARCID TAM3542
 -ADEP SBBR
 -ADES SBGO
 -EOBT 1845
 -EOBD 260606
-END MSGSUM
############################################################

OPERAÇÃO : Recepção de Mensagem LAM

data:   06/06/2026      hora:   18:47:34      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 18:47:33
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE LAM
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 820
-MSGREF
     -SENDER
     -FAC SBBSZQZX
     -RECVR
     -FAC SBBRZTZX
     -SEQNUM 948
-TIMESTAMP 260606184730

############################################################

OPERAÇÃO : Recepção de Mensagem PAC

data:   06/06/2026      hora:   18:48:14      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 18:48:14
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE PAC
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 822
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
     -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-IDPLANO NZQ132ME
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-TIMESTAMP 260606184810

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   18:48:14      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado atual: Piloto Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   18:48:14      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 968
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 822
-TIMESTAMP 260606184814
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   18:48:14      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 969
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-IDPLANO NZQ132ME
-MSGTYP PAC
-TIMESTAMP 260606184814
############################################################

OPERAÇÃO : Recepção de Mensagem PAC

data:   06/06/2026      hora:   19:10:23      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:10:23
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE PAC
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 846
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
     -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-IDPLANO NZQ132ME
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TIMESTAMP 260606191020

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   19:10:23      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Piloto Autorizado
Estado atual: Push-Back Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:10:23      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 364
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 846
-TIMESTAMP 260606191023
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:10:24      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 365
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-IDPLANO NZQ132ME
-MSGTYP PAC
-TIMESTAMP 260606191024
############################################################

OPERAÇÃO : Recepção de Mensagem PAC

data:   06/06/2026      hora:   19:15:15      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:15:14
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE PAC
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 849
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
     -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-IDPLANO NZQ132ME
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-TIMESTAMP 260606191510

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   19:15:15      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Push-Back Autorizado
Estado atual: Taxi Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:15:15      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 429
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 849
-TIMESTAMP 260606191515
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:15:15      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 430
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-IDPLANO NZQ132ME
-MSGTYP PAC
-TIMESTAMP 260606191515
############################################################

OPERAÇÃO : Recepção de Mensagem PAC

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:22:15
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE PAC
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 855
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
     -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-IDPLANO NZQ132ME
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-ENDHLDT 2606061922
-TIMESTAMP 260606192212

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Taxi Autorizado
Estado atual: Chegou ao Holding Point


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 538
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 855
-TIMESTAMP 260606192216
############################################################

OPERAÇÃO : Recepção de Mensagem PAC

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBRZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:22:15
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE PAC
-REFDATA
     -SENDER
     -FAC SBBRZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 856
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
     -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-IDPLANO NZQ132ME
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-ENDHLDT 2606061922
-DCDT 260606192213
-TIMESTAMP 260606192214

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Estado anterior: Chegou ao Holding Point
Estado atual: Decolagem Autorizada


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBBRZTZX
 -SEQNUM 539
-MSGREF
 -SENDER
  -FAC SBBRZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 856
-TIMESTAMP 260606192216
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 540
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-ENDHLDT 2606061922
-IDPLANO NZQ132ME
-MSGTYP PAC
-TIMESTAMP 260606192216
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:22:16      posição: SPA01      ambiente: OpA
Estado: PRE Setor anterior:  NUL NUL  atual: BR NUL NUL  seguinte:  NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE INF
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBRJZPZX
 -SEQNUM 542
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CFL
 -FL F160
-ADES SBGO
-ARCTYP A321
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-ETOT 1845
-FLTTYP S
-CEQPT SWDE2FGHIM1RXYZ
-SEQPT C
-RWYDEP 11R
-SID UMSUB1A SIREM
-CLG 1848
-PBG 1910
-TXC 1915
-ENDHLDT 2606061922
-DCDT 260606192213
-IDPLANO NZQ132ME
-MSGTYP PAC
-TIMESTAMP 260606192216
############################################################

OPERAÇÃO : Correlação/Descorrelação Automática

data:   06/06/2026      hora:   19:24:20      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Correlacionado       : Sim  
Código SSR plano     : A4651 	Código pista         : 4651
Matrícula plano      : PRXBX	Matrícula pista      : 
Pista Correlacionada : 686   

############################################################

OPERAÇÃO : Atualização de Estimados

data:   06/06/2026      hora:   19:24:20      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

PONTOS : SBBR        UMSUB       SIREM       SBGO        
ETIM   : 06-18:45*   06-19:30    06-19:35    06-19:40    
CFL    : 160         160         160         160         

MOTIVO : Correlação Automática

Nível Autorizado: 160

Ponto de Autorização: SBBR

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:24:56      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:24:56      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBBRZTZX	
Mensagem enviada : SIM
Conteúdo         : 
(LAMSBBS/SBBR576SBBR/SBBS861)
############################################################

OPERAÇÃO : Recepção de Mensagem RQP

data:   06/06/2026      hora:   19:25:06      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBRJZPZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:25:06
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
(RQP-TAM3542-SBBR-SBGO-DOF/260606 RMK/IDPLANO NZQ132ME)

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:25:06      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(FPL-TAM3542/A4651-IS

-A321/M-SWDE2FGHIM1RXYZ/C

-SBBR1845

-N0400F160 SIREM

-SBGO0025

-PBN/A1B1C1D1L1O2S2 DAT/SV RMK/IDPLANO NZQ132ME TCAS REG/PRXBX)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:25:07      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem TTY

data:   06/06/2026      hora:   19:25:08      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBANZAZX	
Mensagem enviada : SIM
Conteúdo         : 
(FPVA     TAM3542   4651 A321M N0400 SBBR      SBGO

SIREM 1935 F160                             RMK/W TCAS           

                                         

EQPT/SWDZGHIRXY PBN/A1B1C1D1L1O2S2 REG/PRXBX)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ADEXP

data:   06/06/2026      hora:   19:25:08      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBGOZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE ABI
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBGOZTZX
 -SEQNUM 581
-ARCID TAM3542
-SSRCODE A4651
-ADEP SBBR
-EOBD 260606
-EOBT 1845
-CEQPT SWDZGHIRXY
-SEQPT C
-ADES SBGO
-ARCTYP A321
-FLTTYP S
-NBARC 1
-WKTRC M
-ROUTE N0400F160 SIREM
-FLTRUL I
-TTLEET 0025
-COORDATA
 -PTID SIREM
 -TO 1934
 -TFL F160
-RMK TCAS VIG C
-SID UMSUB1A SIREM
-IDPLANO NZQ132ME
-TIMESTAMP 260606192508
############################################################

OPERAÇÃO : Recepção de Mensagem LAM

data:   06/06/2026      hora:   19:25:12      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBGOZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:25:12
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE LAM
-REFDATA
     -SENDER
     -FAC SBGOZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 224
-MSGREF
     -SENDER
     -FAC SBBSZQZX
     -RECVR
     -FAC SBGOZTZX
     -SEQNUM 581
-TIMESTAMP 260606192509

############################################################

OPERAÇÃO : Recepção de Mensagem RQP

data:   06/06/2026      hora:   19:26:28      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBRJZPZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:26:28
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
(RQP-TAM3542-SBBR-SBGO-DOF/260606 RMK/IDPLANO NZQ132ME)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:26:28      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(FPL-TAM3542/A4651-IS

-A321/M-SWDE2FGHIM1RXYZ/C

-SBBR1845

-N0400F160 SIREM

-SBGO0025

-PBN/A1B1C1D1L1O2S2 DAT/SV RMK/IDPLANO NZQ132ME TCAS REG/PRXBX)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:28:12      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)
############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem ATS

data:   06/06/2026      hora:   19:31:33      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBRJZPZX	
Mensagem enviada : SIM
Conteúdo         : 
(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)
############################################################

OPERAÇÃO : Atualização de Estimados

data:   06/06/2026      hora:   19:43:49      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

PONTOS : SBBR        UMSUB       SIREM       SBGO        
ETIM   : 06-18:45*   06-19:30*   06-19:35*   06-19:44    
CFL    : 160         160         160         160         

MOTIVO : Atualização por Correlação

Nível Autorizado: 160

Ponto de Autorização: SIREM

############################################################

OPERAÇÃO : Atualização de Estimados

data:   06/06/2026      hora:   19:45:49      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

PONTOS : SBBR        UMSUB       SIREM       SBGO        
ETIM   : 06-18:45*   06-19:30*   06-19:35*   06-19:47    
CFL    : 160         160         160         160         

MOTIVO : Atualização por Correlação

Nível Autorizado: 160

Ponto de Autorização: SIREM

############################################################

OPERAÇÃO : Recepção de Mensagem INF ARC

data:   06/06/2026      hora:   19:47:20      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBGOZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:47:19
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
-TITLE INF
-REFDATA
     -SENDER
     -FAC SBGOZTZX
     -RECVR
     -FAC SBBSZQZX
     -SEQNUM 250
-ADARR SBGO
-RWYARR 14
-ARCID TAM3542
-EVENT ARC
-EOBD 260606
-EOBT 1845
-ADEP SBBR
-ADES SBGO
-SSRCODE A4651
-ARCTYP A321
-TIMESTAMP 260606194717
-IDPLANO NZQ132ME

############################################################

OPERAÇÃO : Evento de Transição de Estados de Comandos de Solo

data:   06/06/2026      hora:   19:47:20      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Estado anterior: Decolagem Autorizada
Estado atual: Pouso Autorizado


############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:47:20      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBGOZTZX	
Mensagem enviada : SIM
Conteúdo         : 
-TITLE LAM
-REFDATA
 -SENDER
  -FAC SBBSZQZX
 -RECVR
  -FAC SBGOZTZX
 -SEQNUM 993
-MSGREF
 -SENDER
  -FAC SBGOZTZX
 -RECVR
  -FAC SBBSZQZX
 -SEQNUM 250
-TIMESTAMP 260606194720
############################################################

OPERAÇÃO : Correlação/Descorrelação Automática

data:   06/06/2026      hora:   19:49:56      posição: SPA01      ambiente: OpA
Estado: ATV Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Correlacionado       : Não  
Código SSR plano     : A4651 	Código pista         : 0000
Matrícula plano      : PRXBX	Matrícula pista      : 
Pista Correlacionada : 686   

############################################################

OPERAÇÃO : Recepção de Mensagem ARR

data:   06/06/2026      hora:   19:50:50      posição: SPA01      ambiente: OpA
Estado: TER Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBGOZTZX
Destinatários    : SBBSZQZX	
Data de Recepção : 06/06/2026 19:50:50
Tratamento       : Tratamento executado com sucesso
Conteúdo         : 
(ARRSBGO/SBBS253-TAM3542-SBBR-SBGO1950)
############################################################

OPERAÇÃO : Atualização de Estimados

data:   06/06/2026      hora:   19:50:50      posição: SPA01      ambiente: OpA
Estado: TER Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

PONTOS : SBBR        UMSUB       SIREM       SBGO        
ETIM   : 06-18:45*   06-19:30*   06-19:35*   06-19:50    
CFL    : 160         160         160         160         

MOTIVO : Tratamento de Mensagem ARR

Nível Autorizado: 160

Ponto de Autorização: SIREM

############################################################

OPERAÇÃO : Evento Automático de Envio de Mensagem LAM

data:   06/06/2026      hora:   19:50:50      posição: SPA01      ambiente: OpA
Estado: TER Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Mensagem         : 
Originador       : SBBSZQZX
Destinatários    : SBGOZTZX	
Mensagem enviada : SIM
Conteúdo         : 
(LAMSBBS/SBGO056SBGO/SBBS253)
############################################################

OPERAÇÃO : Evento Automático de Liberação de SSR

data:   06/06/2026      hora:   20:11:00      posição: SPA01      ambiente: OpA
Estado: TER Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Liberado código SSR: 4651

############################################################

OPERAÇÃO : Evento Automático de Arquivamento

data:   06/06/2026      hora:   21:41:09      posição: SPA01      ambiente: OpA
Estado: ARQ Setor anterior:  NUL NUL  atual: BR NCT NUL  seguinte: AN NUL NUL 

Indicativo   : TAM3542    Número de aeronaves : 1        Tipo de voo : S
Regra de voo : I          Tipo de aeronave    : A321     ADES        : SBGO 
Equip. aux.  : SWDE2FGHIM1RXYZ                           ADEP        : SBBR 
Equip. vig.  : C                                         Velocidade  : N0400
Data do voo  : 260606     Dia da Semana       : SAB      EOBT        : 1845 
Turbulência  : M          Tipo de Plano       : RPL      EET         : 0025 
Aeród. alt1. :            Aeród. alt2.        :          Nível       : F160  
Código SSR solicitado :        alocado : A4651
Rota         : SIREM
Observação   : PBN/A1B1C1D1L1O2S2 DAT/SV RMK/TCAS REG/PRXBX
SID         : 
STAR        : 
IDPLANO     : NZQ132ME
ETB     ETN    FIRN    FIRX    IFL    CFL     BPN           BPX    
        1845                          160     SBBR          SBGO        

TRECHOS:     BR    AN
Posição:    AUT   AUT
PrimPto:      0     2

PONTOS : SBBR        UMSUB       SIREM       SBGO        
CFL/IFL: 160         160         160         160         
ETIM   : 06-18:45    06-19:30    06-19:35    06-19:50    

Sobrevoo Sem Pouso dentro dos limites da FIR: NÃO

-------------------- FIM DO HISTÓRICO ----------------------
`;
