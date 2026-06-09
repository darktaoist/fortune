/* ============================================================
   타오운세 — 서비스 이용약관 본문 데이터
   한국어(ko)를 정본으로 하며 en/ja/zh는 참고용 번역.
   block types:  { t:'p', v:{ko,en,ja,zh} }
                 { t:'list', items:[ {v:{...}} | {v:{...}, sub:[{v:{...}}]} ] }
   ============================================================ */
export default {
  lead: {
    ko: '이 약관은 돌마당소프트(이하 "회사"라 합니다)가 인터넷을 통해 제공하는 "타오운세" 웹사이트 서비스 및 이에 부수하는 네트워크, 기타 온라인 서비스(이하 "서비스"라 합니다)의 이용에 대한 회사와 서비스 이용자의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
    en: 'These Terms set out the rights, obligations, and responsibilities of Dolmadang Soft ("the Company") and users of the "Taoist Fortune" website service and its related network and other online services ("the Service") provided by the Company over the internet, as well as other necessary matters.',
    ja: '本規約は、ドルマダンソフト（以下「会社」といいます）がインターネットを通じて提供する「タオ運勢」ウェブサイトサービスおよびこれに付随するネットワーク、その他のオンラインサービス（以下「サービス」といいます）の利用に関する、会社とサービス利用者の権利・義務および責任事項、その他必要な事項を定めることを目的とします。',
    zh: '本條款旨在規範돌마당소프트（以下稱「公司」）透過網際網路提供之「타오運勢」網站服務及其附隨之網路與其他線上服務（以下稱「服務」）之使用，包括公司與服務使用者之權利、義務與責任事項及其他必要事項。',
  },

  chapters: [
    {
      id: 'ch-1',
      title: { ko: '제1장 총칙', en: 'Chapter 1. General Provisions', ja: '第1章 総則', zh: '第1章 總則' },
      articles: [
        {
          id: 'art-1',
          title: { ko: '제1조 (목적)', en: 'Article 1 (Purpose)', ja: '第1条（目的）', zh: '第1條（目的）' },
          blocks: [
            { t: 'p', v: {
              ko: '이 약관은 돌마당소프트(이하 "회사"라 합니다)가 인터넷을 통해 제공하는 "타오운세" 웹사이트 서비스 및 이에 부수하는 네트워크, 기타 온라인 서비스(이하 "서비스"라 합니다)의 이용에 대한 회사와 서비스 이용자의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
              en: 'These Terms aim to define the rights, obligations, and responsibilities of Dolmadang Soft ("the Company") and users of the "Taoist Fortune" website service and its related network and other online services ("the Service") provided over the internet, as well as other necessary matters.',
              ja: '本規約は、ドルマダンソフト（以下「会社」といいます）がインターネットを通じて提供する「タオ運勢」ウェブサイトサービスおよびこれに付随するネットワーク、その他のオンラインサービス（以下「サービス」といいます）の利用に関する、会社とサービス利用者の権利・義務および責任事項、その他必要な事項を定めることを目的とします。',
              zh: '本條款旨在規範돌마당소프트（以下稱「公司」）透過網際網路提供之「타오運勢」網站服務及其附隨之網路與其他線上服務（以下稱「服務」）之使用，包括公司與服務使用者之權利、義務與責任事項及其他必要事項。',
            } },
          ],
        },
        {
          id: 'art-2',
          title: { ko: '제2조 (용어의 정의)', en: 'Article 2 (Definitions)', ja: '第2条（用語の定義）', zh: '第2條（用語定義）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 이 약관에서 사용하는 용어의 정의는 다음과 같습니다.',
              en: '① The terms used in these Terms are defined as follows.',
              ja: '① 本規約で使用する用語の定義は次のとおりです。',
              zh: '① 本條款所使用之用語定義如下。',
            } },
            { t: 'list', items: [
              { v: {
                ko: '"회사"라 함은 인터넷을 통하여 서비스를 제공하는 사업자를 의미합니다.',
                en: '"Company" means the business operator that provides the Service over the internet.',
                ja: '「会社」とは、インターネットを通じてサービスを提供する事業者をいいます。',
                zh: '「公司」係指透過網際網路提供服務之營業人。',
              } },
              { v: {
                ko: '"회원"이란 이 약관에 따라 이용계약을 체결하고, 회사가 제공하는 서비스를 이용하는 자를 의미합니다.',
                en: '"Member" means a person who has entered into a service agreement under these Terms and uses the Service provided by the Company.',
                ja: '「会員」とは、本規約に従って利用契約を締結し、会社が提供するサービスを利用する者をいいます。',
                zh: '「會員」係指依本條款締結使用契約並使用公司所提供服務之人。',
              } },
              { v: {
                ko: '"임시회원"이란 일부 정보만 제공하고 회사가 제공하는 서비스의 일부만 이용하는 자를 의미합니다.',
                en: '"Temporary Member" means a person who provides only some information and uses only part of the Service provided by the Company.',
                ja: '「仮会員」とは、一部の情報のみを提供し、会社が提供するサービスの一部のみを利用する者をいいます。',
                zh: '「臨時會員」係指僅提供部分資訊並僅使用公司所提供服務之一部分之人。',
              } },
              { v: {
                ko: '"인터넷 기기"란 콘텐츠를 이용할 수 있는 기기로서, 컴퓨터, 노트북, 태블릿, 스마트폰 등 인터넷에 접속 가능한 모든 기기를 의미합니다.',
                en: '"Internet Device" means any device capable of accessing the internet to use content, including computers, laptops, tablets, and smartphones.',
                ja: '「インターネット機器」とは、コンテンツを利用できる機器であり、コンピュータ、ノートパソコン、タブレット、スマートフォンなどインターネットに接続可能なすべての機器をいいます。',
                zh: '「網路裝置」係指可用以使用內容之裝置，包括電腦、筆記型電腦、平板、智慧型手機等所有可連線網際網路之裝置。',
              } },
              { v: {
                ko: '"계정정보"란 회원의 회원번호와 외부계정정보, 기기정보, 별명, 프로필 사진, 친구목록 등 회원이 회사에 제공한 정보 등을 통칭합니다.',
                en: '"Account Information" collectively refers to information the Member provides to the Company, such as the membership number, external account information, device information, nickname, profile photo, and friend list.',
                ja: '「アカウント情報」とは、会員の会員番号、外部アカウント情報、機器情報、ニックネーム、プロフィール写真、友達リストなど、会員が会社に提供した情報の総称をいいます。',
                zh: '「帳戶資訊」係指會員提供予公司之資訊之總稱，包括會員編號、外部帳戶資訊、裝置資訊、暱稱、個人檔案照片、好友清單等。',
              } },
              { v: {
                ko: '"콘텐츠"란 인터넷 기기로 이용할 수 있도록 회사가 서비스 제공과 관련하여 디지털방식으로 제작한 유료 또는 무료의 내용물 일체를 의미합니다.',
                en: '"Content" means all paid or free materials produced digitally by the Company in connection with the Service so that they can be used on Internet Devices.',
                ja: '「コンテンツ」とは、インターネット機器で利用できるよう、会社がサービス提供に関連してデジタル方式で制作した有料または無料の内容物一切をいいます。',
                zh: '「內容」係指公司為提供服務而以數位方式製作、可於網路裝置使用之一切付費或免費內容物。',
              } },
              { v: {
                ko: '"웹사이트"란 인터넷에서 콘텐츠를 이용할 수 있도록 구축된 온라인 환경을 의미합니다.',
                en: '"Website" means the online environment built so that content can be used over the internet.',
                ja: '「ウェブサイト」とは、インターネット上でコンテンツを利用できるよう構築されたオンライン環境をいいます。',
                zh: '「網站」係指為於網際網路使用內容而建置之線上環境。',
              } },
              { v: {
                ko: '"웹서비스"란 회사가 제공하는 서비스를 이용하기 위하여 인터넷 기기를 통해 접속하여 사용하는 온라인 서비스 일체를 의미합니다.',
                en: '"Web Service" means all online services accessed and used through Internet Devices in order to use the Service provided by the Company.',
                ja: '「ウェブサービス」とは、会社が提供するサービスを利用するためにインターネット機器を通じて接続して使用するオンラインサービス一切をいいます。',
                zh: '「網路服務」係指為使用公司所提供之服務，透過網路裝置連線使用之一切線上服務。',
              } },
              { v: {
                ko: '"서비스"라 함은 회사가 제공하는 서비스의 하나로서 회원이 인터넷 기기에서 접속하여 이용하는 서비스를 의미합니다.',
                en: '"Service" means a service provided by the Company that a Member accesses and uses from an Internet Device.',
                ja: '「サービス」とは、会社が提供するサービスの一つであり、会員がインターネット機器から接続して利用するサービスをいいます。',
                zh: '「服務」係指公司所提供之服務之一，由會員以網路裝置連線使用之服務。',
              } },
            ] },
            { t: 'p', v: {
              ko: '② 이 약관에서 사용하는 용어의 정의는 본 조 제1항에서 정하는 것을 제외하고는 관계법령 및 서비스별 정책에서 정하는 바에 의하며, 이에 정하지 아니한 것은 일반적인 상 관례에 따릅니다.',
              en: '② Except as defined in Paragraph 1 of this Article, the definitions of terms used in these Terms follow the relevant laws and service-specific policies; matters not so defined follow general commercial practice.',
              ja: '② 本規約で使用する用語の定義は、本条第1項で定めるものを除き、関係法令および各サービスの方針に従い、これに定めのない事項は一般的な商慣習に従います。',
              zh: '② 本條款所使用用語之定義，除本條第1項所定者外，依相關法令及各服務政策之規定；未予規定者，依一般商業慣例。',
            } },
          ],
        },
        {
          id: 'art-3',
          title: { ko: '제3조 (회사정보 등의 제공)', en: 'Article 3 (Provision of Company Information)', ja: '第3条（会社情報等の提供）', zh: '第3條（公司資訊等之提供）' },
          blocks: [
            { t: 'p', v: {
              ko: '회사는 다음 각 호의 사항을 회원이 알아보기 쉽도록 서비스 내에 표시합니다. 다만, 개인정보처리방침과 약관은 회원이 연결화면을 통하여 볼 수 있도록 할 수 있습니다.',
              en: 'The Company shall display the following items within the Service so that Members can easily identify them. However, the privacy policy and terms may be made viewable through a linked screen.',
              ja: '会社は、次の各号の事項を会員が分かりやすいようサービス内に表示します。ただし、個人情報処理方針および規約は、会員がリンク画面を通じて確認できるようにすることができます。',
              zh: '公司應於服務內以會員易於辨識之方式揭示下列事項。但個人資料處理方針及條款，得使會員透過連結畫面瀏覽。',
            } },
            { t: 'list', items: [
              { v: { ko: '상호 및 대표자의 성명', en: 'Trade name and name of the representative', ja: '商号および代表者の氏名', zh: '商號及代表人姓名' } },
              { v: { ko: '영업소 소재지 주소(회원의 불만을 처리할 수 있는 곳의 주소를 포함한다)', en: 'Address of the place of business (including the address where Member complaints can be handled)', ja: '営業所所在地の住所（会員の苦情を処理できる場所の住所を含む）', zh: '營業所所在地地址（含可處理會員申訴之地址）' } },
              { v: { ko: '전화번호, 전자우편주소', en: 'Telephone number and email address', ja: '電話番号、電子メールアドレス', zh: '電話號碼、電子郵件地址' } },
              { v: { ko: '사업자 등록번호', en: 'Business registration number', ja: '事業者登録番号', zh: '營業登記號碼' } },
              { v: { ko: '통신판매업 신고번호', en: 'Mail-order business report number', ja: '通信販売業申告番号', zh: '通信販售業申報號碼' } },
              { v: { ko: '개인정보처리방침', en: 'Privacy policy', ja: '個人情報処理方針', zh: '個人資料處理方針' } },
              { v: { ko: '서비스 이용약관', en: 'Terms of service', ja: 'サービス利用規約', zh: '服務使用條款' } },
            ] },
          ],
        },
        {
          id: 'art-4',
          title: { ko: '제4조 (약관의 효력 및 변경)', en: 'Article 4 (Effect and Amendment of Terms)', ja: '第4条（規約の効力および変更）', zh: '第4條（條款之效力與變更）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회사는 이 약관의 내용을 회원이 알 수 있도록 서비스 내 또는 그 연결화면에 게시합니다. 이 경우 이 약관의 내용 중 서비스 중단, 청약철회, 환급, 계약 해제·해지, 회사의 면책사항 등과 같은 중요한 내용은 굵은 글씨, 색채, 부호 등으로 명확하게 표시하거나 별도의 연결화면 등을 통하여 회원이 알아보기 쉽게 처리합니다.',
              en: '① The Company posts the contents of these Terms within the Service or on its linked screen so that Members can be aware of them. In this case, important matters such as service suspension, withdrawal of subscription, refunds, rescission/termination of the contract, and the Company\u2019s disclaimers are clearly indicated in bold, color, or symbols, or otherwise presented so that Members can easily recognize them through a separate linked screen.',
              ja: '① 会社は、本規約の内容を会員が知ることができるよう、サービス内またはそのリンク画面に掲示します。この場合、サービスの中断、申込みの撤回、返金、契約の解除・解約、会社の免責事項などの重要な内容は、太字、色、記号などで明確に表示するか、別途のリンク画面などを通じて会員が分かりやすいよう処理します。',
              zh: '① 公司應於服務內或其連結畫面公告本條款內容，俾會員知悉。此時，本條款中關於服務中斷、解約退訂、退款、契約解除·終止、公司免責事項等重要內容，將以粗體、顏色、符號等明確標示，或透過另設連結畫面等方式使會員易於辨識。',
            } },
            { t: 'p', v: {
              ko: '② 회사가 약관을 개정할 경우에는 적용일자 및 개정내용, 개정사유 등을 명시하여 최소한 그 적용일 7일 이전부터 서비스 내 또는 그 연결화면에 게시하여 회원에게 공지합니다. 다만, 변경된 내용이 회원에게 불리하거나 중대한 사항의 변경인 경우에는 그 적용일 30일 이전까지 본문과 같은 방법으로 공지하고 제27조 제1항의 방법으로 회원에게 통지합니다. 이 경우 개정 전 내용과 개정 후 내용을 명확하게 비교하여 회원이 알기 쉽도록 표시합니다.',
              en: '② When amending the Terms, the Company specifies the effective date, the amended content, and the reasons for amendment, and notifies Members by posting within the Service or on its linked screen at least 7 days before the effective date. However, if the changes are disadvantageous to Members or constitute a material change, the Company notifies Members in the same manner at least 30 days before the effective date and notifies them by the method set out in Article 27(1). In this case, the pre- and post-amendment contents are clearly compared so that Members can easily understand them.',
              ja: '② 会社が規約を改定する場合は、適用日および改定内容、改定理由などを明示し、少なくともその適用日の7日前からサービス内またはそのリンク画面に掲示して会員に告知します。ただし、変更内容が会員に不利であるか重大な事項の変更である場合は、その適用日の30日前までに本文と同じ方法で告知し、第27条第1項の方法で会員に通知します。この場合、改定前と改定後の内容を明確に比較し、会員が分かりやすいよう表示します。',
              zh: '② 公司修訂條款時，應載明適用日期、修訂內容及修訂事由等，至遲於適用日7日前起於服務內或其連結畫面公告通知會員。但變更內容對會員不利或屬重大事項變更者，應於適用日30日前依前述方法公告，並以第27條第1項之方法通知會員。此時應明確比較修訂前後內容，俾會員易於瞭解。',
            } },
            { t: 'p', v: {
              ko: '③ 회사가 약관을 개정할 경우 개정약관 공지 후 개정약관의 적용에 대한 회원의 동의 여부를 확인합니다. 회사는 제2항의 공지 또는 통지를 할 경우 회원이 개정약관에 대해 동의 또는 거부의 의사표시를 하지 않으면 동의한 것으로 볼 수 있다는 내용도 함께 공지 또는 통지를 하며, 회원이 이 약관 시행일까지 거부의 의사표시를 하지 않는다면 개정약관에 동의한 것으로 볼 수 있습니다. 회원이 개정약관에 대해 동의하지 않는 경우 회사 또는 회원은 서비스 이용계약을 해지할 수 있습니다.',
              en: '③ When amending the Terms, the Company confirms whether Members consent to the application of the amended Terms after the announcement. In making the announcement or notice under Paragraph 2, the Company also states that if a Member does not express consent or refusal regarding the amended Terms, the Member may be deemed to have consented; and if a Member does not express refusal by the effective date of these Terms, the Member may be deemed to have consented to the amended Terms. If a Member does not consent to the amended Terms, the Company or the Member may terminate the service agreement.',
              ja: '③ 会社が規約を改定する場合、改定規約の告知後、改定規約の適用に対する会員の同意の有無を確認します。会社は第2項の告知または通知を行う際、会員が改定規約について同意または拒否の意思表示をしなければ同意したものとみなされる旨もあわせて告知または通知し、会員が本規約の施行日までに拒否の意思表示をしない場合、改定規約に同意したものとみなすことができます。会員が改定規約に同意しない場合、会社または会員はサービス利用契約を解約することができます。',
              zh: '③ 公司修訂條款時，於公告修訂條款後確認會員是否同意適用該修訂條款。公司於為第2項之公告或通知時，併予公告或通知：會員若未就修訂條款表示同意或拒絕，得視為同意；會員若於本條款施行日前未表示拒絕，得視為同意修訂條款。會員不同意修訂條款者，公司或會員得終止服務使用契約。',
            } },
            { t: 'p', v: {
              ko: '④ 회사는 회원이 회사와 이 약관의 내용에 관하여 질의 및 응답을 할 수 있도록 조치를 취합니다.',
              en: '④ The Company takes measures so that Members can raise questions and receive answers from the Company regarding the contents of these Terms.',
              ja: '④ 会社は、会員が会社と本規約の内容について質問および回答ができるよう措置を講じます。',
              zh: '④ 公司應採取措施，俾會員得就本條款內容向公司提出疑問並獲得回覆。',
            } },
            { t: 'p', v: {
              ko: '⑤ 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「정보통신망이용촉진 및 정보보호 등에 관한 법률」, 「콘텐츠산업진흥법」 등 관련 법령에 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.',
              en: '⑤ The Company may amend these Terms within the scope that does not violate relevant laws such as the Act on Consumer Protection in Electronic Commerce, the Act on the Regulation of Terms and Conditions, the Act on Promotion of Information and Communications Network Utilization and Information Protection, and the Content Industry Promotion Act.',
              ja: '⑤ 会社は、「電子商取引等における消費者保護に関する法律」、「約款の規制に関する法律」、「情報通信網利用促進および情報保護等に関する法律」、「コンテンツ産業振興法」など関連法令に違反しない範囲で本規約を改定することができます。',
              zh: '⑤ 公司得於不違反《電子商務等消費者保護法》、《約款規制法》、《資訊通訊網利用促進及資訊保護等法》、《內容產業振興法》等相關法令之範圍內修訂本條款。',
            } },
          ],
        },
        {
          id: 'art-5',
          title: { ko: '제5조 (이용계약의 체결 및 적용)', en: 'Article 5 (Conclusion and Application of the Service Agreement)', ja: '第5条（利用契約の締結および適用）', zh: '第5條（使用契約之締結與適用）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 이용계약은 회원이 되고자 하는 자(이하 "가입신청자"라 합니다.)가 이 약관의 내용에 대하여 동의를 한 다음 서비스 이용 신청을 하고, 회사가 그 신청에 대해서 승낙함으로써 체결됩니다.',
              en: '① The service agreement is concluded when a person who wishes to become a Member ("Applicant") agrees to the contents of these Terms, applies to use the Service, and the Company accepts the application.',
              ja: '① 利用契約は、会員になろうとする者（以下「加入申請者」といいます）が本規約の内容に同意したうえでサービス利用を申し込み、会社がその申込みを承諾することにより締結されます。',
              zh: '① 使用契約於擬成為會員之人（以下稱「申請人」）同意本條款內容後申請使用服務，並經公司承諾該申請時成立。',
            } },
            { t: 'p', v: {
              ko: '② 회사는 가입신청자의 신청에 대하여 승낙함을 원칙으로 합니다. 다만, 회사는 다음 각호의 어느 하나에 해당하는 이용 신청에 대해서는 승낙을 거절할 수 있습니다.',
              en: '② As a rule, the Company accepts Applicants\u2019 applications. However, the Company may refuse to accept an application that falls under any of the following.',
              ja: '② 会社は、加入申請者の申込みを承諾することを原則とします。ただし、会社は次の各号のいずれかに該当する利用申込みについては承諾を拒否することができます。',
              zh: '② 公司原則上承諾申請人之申請。但有下列各款情形之一者，公司得拒絕承諾。',
            } },
            { t: 'list', items: [
              { v: { ko: '이용신청서 내용을 허위로 기재하거나 이용신청 요건을 충족하지 못한 경우', en: 'Where the application contains false information or fails to meet the application requirements', ja: '利用申込書の内容を虚偽に記載した場合、または利用申込要件を満たさない場合', zh: '使用申請書內容記載不實或未符合申請要件者' } },
              { v: { ko: '회사가 서비스를 제공하지 않은 국가에서 비정상적이거나 우회적인 방법을 통해 서비스를 이용하는 경우', en: 'Where the Service is used through abnormal or circumventing methods from a country where the Company does not provide the Service', ja: '会社がサービスを提供していない国から、異常または迂回的な方法でサービスを利用する場合', zh: '於公司未提供服務之國家以異常或迂迴方式使用服務者' } },
              { v: { ko: '서비스 관련 법령에서 금지하는 행위를 할 목적으로 신청하는 경우', en: 'Where the application is made for the purpose of conducting acts prohibited by service-related laws', ja: 'サービス関連法令で禁止される行為を行う目的で申し込む場合', zh: '以從事服務相關法令所禁止行為為目的而申請者' } },
              { v: { ko: '사회의 안녕과 질서 또는 미풍양속을 저해할 목적으로 신청한 경우', en: 'Where the application is made for the purpose of harming public peace and order or good morals', ja: '社会の安寧と秩序または公序良俗を害する目的で申し込んだ場合', zh: '以妨害社會安寧秩序或善良風俗為目的而申請者' } },
              { v: { ko: '부정한 용도로 서비스를 이용하고자 하는 경우', en: 'Where the Applicant intends to use the Service for improper purposes', ja: '不正な用途でサービスを利用しようとする場合', zh: '意圖以不正當用途使用服務者' } },
              { v: { ko: '영리를 추구할 목적으로 서비스를 이용하고자 하는 경우', en: 'Where the Applicant intends to use the Service for profit-seeking purposes', ja: '営利を追求する目的でサービスを利用しようとする場合', zh: '意圖以營利為目的使用服務者' } },
              { v: { ko: '그 밖에 각 호에 준하는 사유로서 승낙이 부적절하다고 판단되는 경우', en: 'Other cases comparable to the foregoing where acceptance is deemed inappropriate', ja: 'その他、各号に準ずる事由として承諾が不適切と判断される場合', zh: '其他準於各款事由而認承諾不適當者' } },
            ] },
            { t: 'p', v: {
              ko: '③ 회사는 다음 각 호의 어느 하나에 해당하는 경우 그 사유가 해소될 때까지 승낙을 유보할 수 있습니다.',
              en: '③ The Company may withhold acceptance until the cause is resolved in any of the following cases.',
              ja: '③ 会社は、次の各号のいずれかに該当する場合、その事由が解消されるまで承諾を留保することができます。',
              zh: '③ 有下列各款情形之一者，公司得於該事由消滅前保留承諾。',
            } },
            { t: 'list', items: [
              { v: { ko: '회사의 설비에 여유가 없거나, 특정 인터넷 기기의 지원이 어렵거나, 기술적 장애가 있는 경우', en: 'Where the Company lacks available facilities, support for a specific Internet Device is difficult, or there is a technical obstacle', ja: '会社の設備に余裕がない場合、特定のインターネット機器の対応が困難な場合、または技術的障害がある場合', zh: '公司設備無餘裕、難以支援特定網路裝置或有技術障礙者' } },
              { v: { ko: '서비스 상의 장애 또는 서비스 이용요금, 결제수단의 장애가 발생한 경우', en: 'Where there is a service malfunction or a problem with the service fee or payment method', ja: 'サービス上の障害、またはサービス利用料金・決済手段の障害が発生した場合', zh: '發生服務障礙或服務使用費、付款方式之障礙者' } },
              { v: { ko: '그 밖의 각 호에 준하는 사유로서 이용신청의 승낙이 어려운 경우', en: 'Other cases comparable to the foregoing where acceptance of the application is difficult', ja: 'その他、各号に準ずる事由として利用申込みの承諾が困難な場合', zh: '其他準於各款事由而難以承諾使用申請者' } },
            ] },
            { t: 'p', v: {
              ko: '④ 회사는 이용계약의 체결 시점에서 가입신청자에게 회원번호와 비밀번호를 부여합니다. 회원번호와 비밀번호는 동일한 기능을 가진 것으로 취급되며, 회원이 자신의 비밀번호를 안전하게 관리할 책임을 부담합니다.',
              en: '④ At the time the service agreement is concluded, the Company assigns a membership number and password to the Applicant. The membership number and password are treated as having the same function, and the Member bears responsibility for securely managing their password.',
              ja: '④ 会社は、利用契約の締結時点で加入申請者に会員番号とパスワードを付与します。会員番号とパスワードは同一の機能を有するものとして扱われ、会員は自らのパスワードを安全に管理する責任を負います。',
              zh: '④ 公司於使用契約締結時授予申請人會員編號與密碼。會員編號與密碼視為具同等功能，會員負有安全管理自身密碼之責任。',
            } },
            { t: 'p', v: {
              ko: '⑤ 회사는 제4항에 따라 부여된 회원번호와 비밀번호의 관리 책임이 회원에게 있으며, 회원은 이를 제3자에게 양도하거나 대여할 수 없습니다.',
              en: '⑤ The responsibility for managing the membership number and password assigned under Paragraph 4 rests with the Member, and the Member may not transfer or lend them to any third party.',
              ja: '⑤ 第4項により付与された会員番号とパスワードの管理責任は会員にあり、会員はこれを第三者に譲渡または貸与することはできません。',
              zh: '⑤ 依第4項所授予之會員編號與密碼，其管理責任歸於會員，會員不得讓與或出借予第三人。',
            } },
          ],
        },
      ],
    },

    {
      id: 'ch-2',
      title: { ko: '제2장 회원의 권리와 의무', en: 'Chapter 2. Rights and Obligations of Members', ja: '第2章 会員の権利と義務', zh: '第2章 會員之權利與義務' },
      articles: [
        {
          id: 'art-6',
          title: { ko: '제6조 (회원의 권리)', en: 'Article 6 (Rights of Members)', ja: '第6条（会員の権利）', zh: '第6條（會員之權利）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회원은 회사가 제공하는 서비스를 자유롭게 이용할 수 있으며, 서비스와 관련하여 자신의 개인정보와 콘텐츠를 보호받을 권리가 있습니다.',
              en: '① Members may freely use the Service provided by the Company and have the right to have their personal information and content protected in connection with the Service.',
              ja: '① 会員は、会社が提供するサービスを自由に利用でき、サービスに関連して自らの個人情報とコンテンツを保護される権利を有します。',
              zh: '① 會員得自由使用公司所提供之服務，並就服務有受保護其個人資料與內容之權利。',
            } },
            { t: 'p', v: {
              ko: '② 회원은 서비스 이용과 관련하여 법령에 의한 권리를 보장받으며, 회사는 이를 보장할 책임이 있습니다.',
              en: '② Members are guaranteed their statutory rights in connection with the use of the Service, and the Company is responsible for guaranteeing these.',
              ja: '② 会員は、サービス利用に関連して法令による権利を保障され、会社はこれを保障する責任を負います。',
              zh: '② 會員就服務之使用享有法令所定權利之保障，公司負有保障之責任。',
            } },
          ],
        },
        {
          id: 'art-7',
          title: { ko: '제7조 (회원의 의무)', en: 'Article 7 (Obligations of Members)', ja: '第7条（会員の義務）', zh: '第7條（會員之義務）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회원은 자신의 계정정보를 안전하게 관리하고, 제3자에게 양도하거나 대여해서는 안 됩니다.',
              en: '① Members must securely manage their Account Information and must not transfer or lend it to any third party.',
              ja: '① 会員は、自らのアカウント情報を安全に管理し、第三者に譲渡または貸与してはなりません。',
              zh: '① 會員應安全管理自身帳戶資訊，且不得讓與或出借予第三人。',
            } },
            { t: 'p', v: {
              ko: '② 회원은 다음 각 호의 행위를 하여서는 안 됩니다.',
              en: '② Members must not engage in any of the following acts.',
              ja: '② 会員は、次の各号の行為をしてはなりません。',
              zh: '② 會員不得為下列各款行為。',
            } },
            { t: 'list', items: [
              { v: { ko: '서비스를 이용하여 불법적인 행위를 하는 경우', en: 'Using the Service to engage in illegal acts', ja: 'サービスを利用して違法行為を行うこと', zh: '利用服務從事不法行為' } },
              { v: { ko: '서비스를 이용하여 타인의 개인정보를 무단으로 수집하거나 사용하는 경우', en: 'Using the Service to collect or use others\u2019 personal information without authorization', ja: 'サービスを利用して他人の個人情報を無断で収集または使用すること', zh: '利用服務未經授權蒐集或使用他人個人資料' } },
              { v: { ko: '서비스의 정상적인 운영을 방해하는 행위를 하는 경우', en: 'Engaging in acts that interfere with the normal operation of the Service', ja: 'サービスの正常な運営を妨害する行為を行うこと', zh: '從事妨害服務正常運作之行為' } },
              { v: { ko: '서비스와 관련된 모든 법령을 위반하는 경우', en: 'Violating any laws related to the Service', ja: 'サービスに関連するすべての法令に違反すること', zh: '違反與服務相關之一切法令' } },
              { v: { ko: '회사의 명예를 훼손하거나 법령을 위반하는 경우', en: 'Damaging the Company\u2019s reputation or violating laws', ja: '会社の名誉を毀損し、または法令に違反すること', zh: '損害公司名譽或違反法令' } },
            ] },
          ],
        },
      ],
    },

    {
      id: 'ch-3',
      title: { ko: '제3장 서비스의 이용', en: 'Chapter 3. Use of the Service', ja: '第3章 サービスの利用', zh: '第3章 服務之使用' },
      articles: [
        {
          id: 'art-8',
          title: { ko: '제8조 (서비스의 제공)', en: 'Article 8 (Provision of the Service)', ja: '第8条（サービスの提供）', zh: '第8條（服務之提供）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회사는 회원에게 다음과 같은 서비스를 제공합니다.',
              en: '① The Company provides Members with the following services.',
              ja: '① 会社は、会員に対し次のようなサービスを提供します。',
              zh: '① 公司向會員提供下列服務。',
            } },
            { t: 'list', items: [
              { v: { ko: '운세 및 점술 콘텐츠 제공', en: 'Provision of fortune-telling and divination content', ja: '運勢および占いコンテンツの提供', zh: '提供運勢及占卜內容' } },
              { v: { ko: '개인 맞춤형 운세 정보 제공', en: 'Provision of personalized fortune information', ja: '個人向けカスタマイズ運勢情報の提供', zh: '提供個人客製化運勢資訊' } },
              { v: { ko: '회원간의 소통 및 정보 공유', en: 'Communication and information sharing among Members', ja: '会員間のコミュニケーションおよび情報共有', zh: '會員間之溝通與資訊分享' } },
            ] },
            { t: 'p', v: {
              ko: '② 회사는 서비스의 품질을 향상시키기 위해 지속적으로 노력하며, 서비스의 변경 또는 중단이 필요한 경우 회원에게 사전에 공지합니다.',
              en: '② The Company continuously strives to improve the quality of the Service and notifies Members in advance when changes or suspension of the Service are necessary.',
              ja: '② 会社は、サービスの品質向上のため継続的に努力し、サービスの変更または中断が必要な場合は会員に事前に告知します。',
              zh: '② 公司持續致力提升服務品質，於需變更或中斷服務時，事先通知會員。',
            } },
          ],
        },
        {
          id: 'art-9',
          title: { ko: '제9조 (서비스 이용의 제한)', en: 'Article 9 (Restrictions on Use of the Service)', ja: '第9条（サービス利用の制限）', zh: '第9條（服務使用之限制）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회사는 다음 각 호의 경우에 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다.',
              en: '① The Company may restrict or suspend all or part of the Service in any of the following cases.',
              ja: '① 会社は、次の各号の場合にサービスの全部または一部を制限または中断することができます。',
              zh: '① 有下列各款情形之一者，公司得限制或中斷服務之全部或一部。',
            } },
            { t: 'list', items: [
              { v: { ko: '시스템 점검, 유지보수, 업그레이드 등의 이유로 서비스가 일시적으로 중단될 경우', en: 'Where the Service is temporarily suspended for reasons such as system inspection, maintenance, or upgrades', ja: 'システム点検、保守、アップグレードなどの理由でサービスが一時的に中断される場合', zh: '因系統檢查、維護、升級等原因致服務暫時中斷者' } },
              { v: { ko: '전기통신사업법 또는 기타 관련 법령에 의해 서비스의 제공이 중단되는 경우', en: 'Where provision of the Service is suspended under the Telecommunications Business Act or other relevant laws', ja: '電気通信事業法またはその他の関連法令によりサービスの提供が中断される場合', zh: '依電信事業法或其他相關法令致服務之提供中斷者' } },
              { v: { ko: '회원이 제7조를 위반하거나 서비스 이용에 관련된 법령을 위반한 경우', en: 'Where a Member violates Article 7 or laws related to use of the Service', ja: '会員が第7条に違反し、またはサービス利用に関連する法令に違反した場合', zh: '會員違反第7條或違反與服務使用相關之法令者' } },
            ] },
            { t: 'p', v: {
              ko: '② 회사는 서비스의 전부 또는 일부를 제한하거나 중단할 경우, 이를 사전에 회원에게 공지하며, 불가피한 사유로 인한 중단의 경우 사후에 공지할 수 있습니다.',
              en: '② When restricting or suspending all or part of the Service, the Company notifies Members in advance; in the case of suspension due to unavoidable reasons, it may notify them afterward.',
              ja: '② 会社は、サービスの全部または一部を制限または中断する場合、事前に会員に告知し、やむを得ない事由による中断の場合は事後に告知することができます。',
              zh: '② 公司限制或中斷服務之全部或一部時，應事先通知會員；因不得已事由而中斷者，得於事後通知。',
            } },
          ],
        },
      ],
    },

    {
      id: 'ch-4',
      title: { ko: '제4장 계약의 해제 및 해지', en: 'Chapter 4. Rescission and Termination of the Contract', ja: '第4章 契約の解除および解約', zh: '第4章 契約之解除及終止' },
      articles: [
        {
          id: 'art-10',
          title: { ko: '제10조 (계약의 해제 및 해지)', en: 'Article 10 (Rescission and Termination of the Contract)', ja: '第10条（契約の解除および解約）', zh: '第10條（契約之解除及終止）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회원은 언제든지 회사에 계약 해지 요청을 할 수 있으며, 회사는 이 요청을 접수한 후 정해진 절차에 따라 처리합니다.',
              en: '① A Member may request termination of the contract from the Company at any time, and the Company processes the request according to the prescribed procedures after receiving it.',
              ja: '① 会員はいつでも会社に契約解約を請求することができ、会社はこの請求を受け付けた後、定められた手続きに従って処理します。',
              zh: '① 會員得隨時向公司請求終止契約，公司於受理該請求後依所定程序處理。',
            } },
            { t: 'p', v: {
              ko: '② 회사는 다음 각 호의 경우 회원의 계약을 해지할 수 있습니다.',
              en: '② The Company may terminate a Member\u2019s contract in any of the following cases.',
              ja: '② 会社は、次の各号の場合に会員の契約を解約することができます。',
              zh: '② 有下列各款情形之一者，公司得終止會員之契約。',
            } },
            { t: 'list', items: [
              { v: { ko: '회원이 제7조를 위반하거나 서비스 이용에 관련된 법령을 위반한 경우', en: 'Where a Member violates Article 7 or laws related to use of the Service', ja: '会員が第7条に違反し、またはサービス利用に関連する法令に違反した場合', zh: '會員違反第7條或違反與服務使用相關之法令者' } },
              { v: { ko: '회원의 계정정보를 부정하게 사용하는 경우', en: 'Where Account Information is used improperly', ja: '会員のアカウント情報を不正に使用する場合', zh: '不正當使用會員帳戶資訊者' } },
              { v: { ko: '서비스의 정상적인 운영을 방해하는 행위를 하는 경우', en: 'Where acts interfering with the normal operation of the Service are committed', ja: 'サービスの正常な運営を妨害する行為を行う場合', zh: '從事妨害服務正常運作之行為者' } },
            ] },
          ],
        },
        {
          id: 'art-11',
          title: { ko: '제11조 (계약 해지의 효과)', en: 'Article 11 (Effect of Termination)', ja: '第11条（契約解約の効果）', zh: '第11條（契約終止之效果）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 계약이 해지되면 회원의 계정정보는 삭제되며, 회원은 서비스에 대한 접근 권한을 상실합니다.',
              en: '① Upon termination of the contract, the Member\u2019s Account Information is deleted, and the Member loses access rights to the Service.',
              ja: '① 契約が解約されると、会員のアカウント情報は削除され、会員はサービスへのアクセス権限を失います。',
              zh: '① 契約終止後，會員之帳戶資訊將被刪除，會員喪失對服務之存取權限。',
            } },
            { t: 'p', v: {
              ko: '② 계약 해지 시, 회원은 회사에 대해 남아 있는 모든 권리와 의무를 종료하게 됩니다.',
              en: '② Upon termination of the contract, all remaining rights and obligations of the Member toward the Company are terminated.',
              ja: '② 契約解約時、会員は会社に対して残存するすべての権利と義務を終了させることになります。',
              zh: '② 契約終止時，會員對公司之一切剩餘權利與義務即告終止。',
            } },
          ],
        },
        {
          id: 'art-11-2',
          title: { ko: '제11조의2 (환불 정책)', en: 'Article 11-2 (Refund Policy)', ja: '第11条の2（返金ポリシー）', zh: '第11條之2（退款政策）', emphasize: true },
          blocks: [
            { t: 'p', v: {
              ko: '① 회원이 유료 서비스 이용 계약을 청약철회하는 경우, 회사는 다음 각 호에 따라 환불을 처리합니다.',
              en: '① Where a Member withdraws a paid-service agreement, the Company processes refunds in accordance with the following.',
              ja: '① 会員が有料サービス利用契約を申込み撤回する場合、会社は次の各号に従って返金を処理します。',
              zh: '① 會員撤回付費服務使用契約者，公司依下列各款處理退款。',
            } },
            { t: 'list', items: [
              { v: { ko: '디지털 콘텐츠 구매 후 콘텐츠를 열람하거나 이용하지 않은 경우: 구매일로부터 7일 이내 청약철회 및 전액 환불이 가능합니다.', en: 'Where digital content has been purchased but not viewed or used: withdrawal and a full refund are available within 7 days of purchase.', ja: 'デジタルコンテンツの購入後、コンテンツを閲覧または利用していない場合：購入日から7日以内に申込み撤回および全額返金が可能です。', zh: '購買數位內容後尚未閱覽或使用者：自購買日起7日內得撤回並全額退款。' } },
              { v: { ko: '디지털 콘텐츠를 이미 열람하거나 이용한 경우: 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 청약철회가 제한됩니다.', en: 'Where digital content has already been viewed or used: withdrawal is restricted under the Act on Consumer Protection in Electronic Commerce.', ja: 'デジタルコンテンツをすでに閲覧または利用した場合：「電子商取引等における消費者保護に関する法律」により申込み撤回が制限されます。', zh: '已閱覽或使用數位內容者：依《電子商務等消費者保護法》限制撤回。' } },
              { v: { ko: '결제 후 서비스가 제공되지 않은 경우: 전액 환불이 가능합니다.', en: 'Where the Service was not provided after payment: a full refund is available.', ja: '決済後にサービスが提供されなかった場合：全額返金が可能です。', zh: '付款後未提供服務者：得全額退款。' } },
            ] },
            { t: 'p', v: {
              ko: '② 다음 각 호의 경우에는 환불이 제한될 수 있습니다.',
              en: '② Refunds may be restricted in any of the following cases.',
              ja: '② 次の各号の場合には返金が制限されることがあります。',
              zh: '② 有下列各款情形之一者，退款得受限制。',
            } },
            { t: 'list', items: [
              { v: { ko: '회원이 제7조(회원의 의무)를 위반하여 서비스 이용이 제한된 경우', en: 'Where the Member\u2019s use of the Service is restricted due to a violation of Article 7 (Obligations of Members)', ja: '会員が第7条（会員の義務）に違反してサービス利用が制限された場合', zh: '會員違反第7條（會員之義務）致服務使用受限者' } },
              { v: { ko: '시스템 오류가 아닌 회원의 잘못된 정보 입력으로 인한 결과에 대해 재결제를 요구하는 경우', en: 'Where re-payment is requested for a result caused by the Member\u2019s incorrect input rather than a system error', ja: 'システムエラーではなく会員の誤った情報入力による結果について再決済を要求する場合', zh: '就非系統錯誤而係會員輸入錯誤資訊所致之結果要求重新付款者' } },
              { v: { ko: '무료 이벤트나 할인 혜택으로 제공받은 서비스에 대한 경우', en: 'Where the Service was provided through a free event or discount benefit', ja: '無料イベントや割引特典で提供を受けたサービスの場合', zh: '透過免費活動或折扣優惠所獲得之服務者' } },
              { v: { ko: '천재지변 등 불가항력적인 사유로 서비스 제공이 불가능한 경우', en: 'Where provision of the Service is impossible due to force majeure such as natural disasters', ja: '天災地変など不可抗力的事由によりサービス提供が不可能な場合', zh: '因天災等不可抗力事由致無法提供服務者' } },
            ] },
            { t: 'p', v: {
              ko: '③ 환불 처리 절차는 다음과 같습니다.',
              en: '③ The refund procedure is as follows.',
              ja: '③ 返金処理の手続きは次のとおりです。',
              zh: '③ 退款處理程序如下。',
            } },
            { t: 'list', items: [
              { v: { ko: '회원은 help@taoist.co.kr로 환불 요청을 해야 합니다.', en: 'The Member must submit a refund request to help@taoist.co.kr.', ja: '会員は help@taoist.co.kr に返金を請求しなければなりません。', zh: '會員應向 help@taoist.co.kr 提出退款請求。' } },
              { v: {
                ko: '환불 요청 시 다음 정보를 포함해야 합니다:',
                en: 'The refund request must include the following information:',
                ja: '返金請求の際は、次の情報を含めなければなりません：',
                zh: '提出退款請求時應包含下列資訊：',
              }, sub: [
                { v: { ko: '결제 정보 (결제일시, 결제 수단, 결제 금액)', en: 'Payment information (payment date/time, method, amount)', ja: '決済情報（決済日時、決済手段、決済金額）', zh: '付款資訊（付款日期時間、付款方式、付款金額）' } },
                { v: { ko: '구매한 서비스 내용', en: 'Details of the purchased service', ja: '購入したサービス内容', zh: '所購買之服務內容' } },
                { v: { ko: '환불 요청 사유', en: 'Reason for the refund request', ja: '返金請求の事由', zh: '退款請求事由' } },
              ] },
              { v: { ko: '회사는 환불 요청을 받은 날로부터 3영업일 이내에 처리 결과를 통지합니다.', en: 'The Company notifies the result within 3 business days from the date the refund request is received.', ja: '会社は、返金請求を受けた日から3営業日以内に処理結果を通知します。', zh: '公司於受理退款請求之日起3個營業日內通知處理結果。' } },
              { v: {
                ko: '환불 승인 시 원래 결제 수단으로 환불하며, 결제 수단별 처리 기간은 다를 수 있습니다:',
                en: 'Upon approval, refunds are made to the original payment method; processing periods may vary by method:',
                ja: '返金承認時は元の決済手段に返金し、決済手段ごとの処理期間は異なる場合があります：',
                zh: '退款核准時退回原付款方式，各付款方式之處理期間可能不同：',
              }, sub: [
                { v: { ko: '신용카드: 승인 후 2-5영업일', en: 'Credit card: 2–5 business days after approval', ja: 'クレジットカード：承認後2〜5営業日', zh: '信用卡：核准後2-5個營業日' } },
                { v: { ko: '계좌이체: 승인 후 1-2영업일', en: 'Bank transfer: 1–2 business days after approval', ja: '口座振替：承認後1〜2営業日', zh: '帳戶轉帳：核准後1-2個營業日' } },
                { v: { ko: '휴대폰 결제: 승인 후 당월 또는 익월 정산', en: 'Mobile payment: settled in the current or following month after approval', ja: '携帯電話決済：承認後、当月または翌月精算', zh: '行動電話付款：核准後於當月或次月結算' } },
              ] },
            ] },
            { t: 'p', v: {
              ko: '④ 환불금액은 다음과 같이 산정됩니다.',
              en: '④ The refund amount is calculated as follows.',
              ja: '④ 返金額は次のように算定されます。',
              zh: '④ 退款金額依下列方式計算。',
            } },
            { t: 'list', items: [
              { v: { ko: '미사용 디지털 콘텐츠: 결제 금액 전액', en: 'Unused digital content: the full payment amount', ja: '未使用のデジタルコンテンツ：決済金額の全額', zh: '未使用之數位內容：付款金額全額' } },
              { v: { ko: '부분 사용된 서비스: 관련 법령에 따라 개별 검토 후 결정', en: 'Partially used service: determined after individual review in accordance with relevant laws', ja: '一部使用されたサービス：関連法令に従い個別に検討のうえ決定', zh: '部分使用之服務：依相關法令個別審查後決定' } },
              { v: { ko: '시스템 오류로 인한 중복 결제: 중복 결제 금액 전액', en: 'Duplicate payment due to a system error: the full duplicate payment amount', ja: 'システムエラーによる重複決済：重複決済金額の全額', zh: '因系統錯誤之重複付款：重複付款金額全額' } },
            ] },
            { t: 'p', v: {
              ko: '⑤ 다음의 경우 환불 수수료가 발생할 수 있습니다.',
              en: '⑤ Refund fees may arise in the following cases.',
              ja: '⑤ 次の場合、返金手数料が発生することがあります。',
              zh: '⑤ 於下列情形可能產生退款手續費。',
            } },
            { t: 'list', items: [
              { v: { ko: 'PG사(결제대행사) 정책에 따른 환불 수수료', en: 'Refund fees under the policy of the PG (payment gateway) company', ja: 'PG社（決済代行会社）の方針による返金手数料', zh: '依PG（金流代理）公司政策之退款手續費' } },
              { v: { ko: '해외 결제의 경우 환율 차이로 인한 차액', en: 'For overseas payments, differences due to exchange-rate fluctuations', ja: '海外決済の場合、為替差による差額', zh: '海外付款時因匯率差異所生之差額' } },
            ] },
            { t: 'p', v: {
              ko: '⑥ 환불 관련 분쟁 발생 시 회사와 회원은 상호 협의를 통해 해결하며, 협의가 어려운 경우 소비자분쟁조정위원회 등 관련 기관의 조정을 받을 수 있습니다.',
              en: '⑥ In the event of a refund-related dispute, the Company and the Member resolve it through mutual consultation; if consultation is difficult, they may seek mediation from relevant bodies such as the Consumer Dispute Mediation Committee.',
              ja: '⑥ 返金関連の紛争が生じた場合、会社と会員は相互協議により解決し、協議が困難な場合は消費者紛争調整委員会など関連機関の調整を受けることができます。',
              zh: '⑥ 發生退款相關爭議時，公司與會員透過相互協商解決；協商困難者，得申請消費者糾紛調解委員會等相關機關之調解。',
            } },
          ],
        },
      ],
    },

    {
      id: 'ch-5',
      title: { ko: '제5장 면책 조항', en: 'Chapter 5. Disclaimers', ja: '第5章 免責条項', zh: '第5章 免責條款' },
      articles: [
        {
          id: 'art-12',
          title: { ko: '제12조 (면책 조항)', en: 'Article 12 (Disclaimers)', ja: '第12条（免責条項）', zh: '第12條（免責條款）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 회사는 다음 각 호의 경우에는 책임을 지지 않습니다.',
              en: '① The Company is not liable in any of the following cases.',
              ja: '① 会社は、次の各号の場合には責任を負いません。',
              zh: '① 有下列各款情形之一者，公司不負責任。',
            } },
            { t: 'list', items: [
              { v: { ko: '회원이 제7조를 위반한 경우', en: 'Where a Member violates Article 7', ja: '会員が第7条に違反した場合', zh: '會員違反第7條者' } },
              { v: { ko: '서비스 이용에 따른 손해나 사고가 회원의 책임으로 발생한 경우', en: 'Where damage or an accident arising from use of the Service is caused by the Member\u2019s responsibility', ja: 'サービス利用に伴う損害や事故が会員の責任で発生した場合', zh: '因使用服務所生之損害或事故係由會員之責任所致者' } },
              { v: { ko: '천재지변, 전쟁, 테러 등 불가항력적인 사유로 인해 서비스가 중단되거나 장애가 발생한 경우', en: 'Where the Service is suspended or malfunctions due to force majeure such as natural disasters, war, or terrorism', ja: '天災地変、戦争、テロなど不可抗力的事由によりサービスが中断または障害が発生した場合', zh: '因天災、戰爭、恐怖攻擊等不可抗力事由致服務中斷或發生障礙者' } },
            ] },
            { t: 'p', v: {
              ko: '② 회사는 서비스의 안전성과 안정성을 보장하기 위해 최선의 노력을 다하지만, 서비스 이용 중 발생할 수 있는 기술적 문제에 대해서는 책임을 지지 않습니다.',
              en: '② The Company makes its best efforts to ensure the safety and stability of the Service, but is not liable for technical problems that may occur during use of the Service.',
              ja: '② 会社は、サービスの安全性と安定性を保証するため最善の努力を尽くしますが、サービス利用中に発生し得る技術的問題については責任を負いません。',
              zh: '② 公司盡最大努力確保服務之安全性與穩定性，惟對使用服務期間可能發生之技術問題不負責任。',
            } },
          ],
        },
      ],
    },

    {
      id: 'ch-6',
      title: { ko: '제6장 기타', en: 'Chapter 6. Miscellaneous', ja: '第6章 その他', zh: '第6章 其他' },
      articles: [
        {
          id: 'art-13',
          title: { ko: '제13조 (준거법 및 분쟁 해결)', en: 'Article 13 (Governing Law and Dispute Resolution)', ja: '第13条（準拠法および紛争解決）', zh: '第13條（準據法及爭議解決）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 이 약관은 대한민국 법령에 따라 해석됩니다.',
              en: '① These Terms are interpreted in accordance with the laws of the Republic of Korea.',
              ja: '① 本規約は大韓民国の法令に従って解釈されます。',
              zh: '① 本條款依大韓民國法令解釋。',
            } },
            { t: 'p', v: {
              ko: '② 서비스와 관련된 분쟁이 발생할 경우, 회사와 회원은 협의하여 해결하며, 협의가 이루어지지 않는 경우 관할 법원에 소송을 제기할 수 있습니다.',
              en: '② In the event of a dispute related to the Service, the Company and the Member resolve it through consultation; if no agreement is reached, either may bring an action before the competent court.',
              ja: '② サービスに関連する紛争が生じた場合、会社と会員は協議して解決し、協議が成立しない場合は管轄裁判所に訴訟を提起することができます。',
              zh: '② 發生與服務相關之爭議時，公司與會員協商解決；協商不成者，得向管轄法院提起訴訟。',
            } },
          ],
        },
        {
          id: 'art-14',
          title: { ko: '제14조 (기타)', en: 'Article 14 (Miscellaneous)', ja: '第14条（その他）', zh: '第14條（其他）' },
          blocks: [
            { t: 'p', v: {
              ko: '① 이 약관에 규정되지 않은 사항은 관련 법령에 따릅니다.',
              en: '① Matters not provided for in these Terms are governed by relevant laws.',
              ja: '① 本規約に定めのない事項は、関連法令に従います。',
              zh: '① 本條款未規定之事項，依相關法令辦理。',
            } },
            { t: 'p', v: {
              ko: '② 회사와 회원 간의 기타 사항은 별도로 협의하여 정할 수 있습니다.',
              en: '② Other matters between the Company and Members may be determined by separate agreement.',
              ja: '② 会社と会員の間のその他の事項は、別途協議して定めることができます。',
              zh: '② 公司與會員間之其他事項，得另行協商定之。',
            } },
          ],
        },
      ],
    },
  ],

  dates: {
    noticeLabel:    { ko: '공고일자', en: 'Notice Date', ja: '公告日', zh: '公告日期' },
    noticeDate:     { ko: '2025년 6월 1일', en: 'June 1, 2025', ja: '2025年6月1日', zh: '2025年6月1日' },
    effectiveLabel: { ko: '시행일자', en: 'Effective Date', ja: '施行日', zh: '生效日期' },
    effectiveDate:  { ko: '2025년 6월 8일', en: 'June 8, 2025', ja: '2025年6月8日', zh: '2025年6月8日' },
    closing: {
      ko: '본 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 대한민국 법원이 관할권을 가집니다.',
      en: 'These Terms are interpreted in accordance with the laws of the Republic of Korea, and Korean courts have jurisdiction in the event of a dispute.',
      ja: '本規約は大韓民国の法令に従って解釈され、紛争が生じた場合は大韓民国の裁判所が管轄権を有します。',
      zh: '本條款依大韓民國法令解釋，發生爭議時由大韓民國法院管轄。',
    },
  },
};
