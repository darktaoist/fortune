/* ============================================================
   타오운세 — 개인정보 처리방침 본문 데이터
   한국어(ko)를 정본으로 하며 en/ja/zh는 참고용 번역.
   block types:
     { t:'p', v:{ko,en,ja,zh} }
     { t:'list', items:[ {v:{...}} | {v:{...}, sub:[{v:{...}}]} ] }
     { t:'olist', items:[ {v:{...}} ] }            // 번호 매겨진 목록
     { t:'table', head:[{...}], rows:[[{...}, ...]] }
     { t:'kv', rows:[ {k:{...}, v:'고정값'} ] }     // 관리책임자 등
   ============================================================ */
export default {
  intro: [
    {
      ko: '돌마당소프트(이하 "회사")는 서비스 이용을 위해 입력한 정보주체의 개인정보보호를 매우 중요시하며, "개인정보보호법"을 준수하고 있습니다.',
      en: 'Dolmadang Soft ("the Company") places great importance on protecting the personal information of data subjects who provide it to use the Service, and complies with the Personal Information Protection Act.',
      ja: 'ドルマダンソフト（以下「会社」）は、サービス利用のために入力された情報主体の個人情報保護を非常に重視しており、「個人情報保護法」を遵守しています。',
      zh: '돌마당소프트（以下稱「公司」）非常重視為使用服務而提供資料之當事人之個人資料保護，並遵守《個人資料保護法》。',
    },
    {
      ko: '회사는 개인정보보호정책을 통해 이용자가 공개한 개인정보가 어떠한 용도와 방식으로 이용되고 있는지, 그리고 개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 구체적으로 알려드립니다.',
      en: 'Through this Privacy Policy, the Company explains in detail for what purposes and in what manner the personal information disclosed by users is used, and what measures are taken to protect it.',
      ja: '会社は、本プライバシーポリシーを通じて、利用者が公開した個人情報がどのような用途と方式で利用されているか、また個人情報保護のためにどのような措置が取られているかを具体的にお知らせします。',
      zh: '公司透過本隱私權政策，具體說明使用者所提供之個人資料以何種用途與方式被利用，以及為保護個人資料所採取之措施。',
    },
    {
      ko: '본 개인정보보호정책은 관계법령의 변경 및 회사가 제공하는 서비스의 내용 변경에 따라 변경될 수 있으므로 사이트 방문 시 수시로 확인하시기 바랍니다.',
      en: 'This Privacy Policy may change in line with amendments to relevant laws and changes to the Service provided by the Company, so please check it from time to time when visiting the site.',
      ja: '本プライバシーポリシーは、関係法令の変更および会社が提供するサービス内容の変更に伴い変更されることがありますので、サイト訪問時に随時ご確認ください。',
      zh: '本隱私權政策可能因相關法令變更及公司所提供服務內容變更而修改，請於造訪網站時隨時確認。',
    },
    {
      ko: '본 개인정보처리방침은 회사가 서비스하는 타오운세 서비스에만 해당합니다.',
      en: 'This Privacy Policy applies only to the Taoist Fortune service operated by the Company.',
      ja: '本プライバシーポリシーは、会社が提供するタオ運勢サービスにのみ適用されます。',
      zh: '本隱私權政策僅適用於公司所經營之타오運勢服務。',
    },
  ],

  sections: [
    {
      id: 'p-1',
      title: { ko: '1. 개인정보의 이용(처리)목적', en: '1. Purpose of Using (Processing) Personal Information', ja: '1. 個人情報の利用（処理）目的', zh: '1. 個人資料之利用（處理）目的' },
      blocks: [
        { t: 'p', v: {
          ko: '회사는 운세서비스 이용 및 통계∙분석을 통한 마케팅 자료로서 개인정보를 수집하며, 정보주체의 분포도, 관심사, 이용행태 등을 분석하는 데 이용할 수 있습니다.',
          en: 'The Company collects personal information for use of the fortune service and as marketing data through statistics and analysis, and may use it to analyze data subjects’ distribution, interests, and usage behavior.',
          ja: '会社は、運勢サービスの利用および統計・分析を通じたマーケティング資料として個人情報を収集し、情報主体の分布、関心事、利用行動などを分析するために利用することがあります。',
          zh: '公司為運勢服務之使用及透過統計與分析作為行銷資料而蒐集個人資料，並可用以分析資料當事人之分布、興趣與使用行為。',
        } },
        { t: 'p', v: {
          ko: '회사가 수집하는 개인정보 항목에 따른 구체적인 수집목적 및 이용목적은 다음과 같습니다.',
          en: 'The specific purposes of collection and use according to the personal information items collected by the Company are as follows.',
          ja: '会社が収集する個人情報項目に応じた具体的な収集目的および利用目的は次のとおりです。',
          zh: '公司所蒐集個人資料項目對應之具體蒐集目的及利用目的如下。',
        } },
        { t: 'table',
          head: [
            { ko: '항목', en: 'Item', ja: '項目', zh: '項目' },
            { ko: '구분', en: 'Type', ja: '区分', zh: '區分' },
            { ko: '내용', en: 'Details', ja: '内容', zh: '內容' },
            { ko: '비고', en: 'Notes', ja: '備考', zh: '備註' },
          ],
          rows: [
            [
              { ko: '운세서비스', en: 'Fortune service', ja: '運勢サービス', zh: '運勢服務' },
              { ko: '무료', en: 'Free', ja: '無料', zh: '免費' },
              { ko: '성별, 달력구분, 생년월일, 출생시분, 대한민국출생여부', en: 'Gender, calendar type, date of birth, time of birth, whether born in South Korea', ja: '性別、暦区分、生年月日、出生時分、韓国出生の有無', zh: '性別、曆別、出生年月日、出生時分、是否於韓國出生' },
              { ko: '서비스에 따라 수집 항목이 일부 달라질 수 있음', en: 'Collected items may vary somewhat by service', ja: 'サービスにより収集項目が一部異なる場合があります', zh: '蒐集項目可能因服務而略有不同' },
            ],
            [
              { ko: '', en: '', ja: '', zh: '' },
              { ko: '유료', en: 'Paid', ja: '有料', zh: '付費' },
              { ko: '이름, 성별, 달력구분, 생년월일, 출생시분, 대한민국출생여부, 휴대폰번호', en: 'Name, gender, calendar type, date of birth, time of birth, whether born in South Korea, mobile number', ja: '氏名、性別、暦区分、生年月日、出生時分、韓国出生の有無、携帯電話番号', zh: '姓名、性別、曆別、出生年月日、出生時分、是否於韓國出生、行動電話號碼' },
              { ko: '운세 다시보기 서비스 이용 시 필요', en: 'Required when using the reading-replay service', ja: '運勢の再閲覧サービス利用時に必要', zh: '使用運勢回看服務時所需' },
            ],
            [
              { ko: '오류문의', en: 'Error inquiry', ja: 'エラー問い合わせ', zh: '錯誤詢問' },
              { ko: '-', en: '-', ja: '-', zh: '-' },
              { ko: '구매자 이름, 휴대폰번호, 이메일주소', en: 'Buyer’s name, mobile number, email address', ja: '購入者の氏名、携帯電話番号、メールアドレス', zh: '購買者姓名、行動電話號碼、電子郵件地址' },
              { ko: '오류문의 작성 및 회신 시 필요', en: 'Required to file an error inquiry and to reply', ja: 'エラー問い合わせの作成および返信時に必要', zh: '撰寫錯誤詢問及回覆時所需' },
            ],
          ],
        },
      ],
    },
    {
      id: 'p-2',
      title: { ko: '2. 개인정보 처리 및 보유기간', en: '2. Processing and Retention Period of Personal Information', ja: '2. 個人情報の処理および保有期間', zh: '2. 個人資料之處理及保存期間' },
      blocks: [
        { t: 'p', v: {
          ko: '회사는 이용자로부터 수집한 개인정보를 유료서비스의 경우 결과 다시보기를 위해 보유하며, 그 외의 경우 지체없이 파기합니다. 다만, 아래의 경우에 명시한 기간 동안 보유합니다.',
          en: 'For paid services, the Company retains the personal information collected from users to enable result replay; otherwise, it destroys the information without delay. However, it is retained for the periods specified below in the following cases.',
          ja: '会社は、利用者から収集した個人情報を、有料サービスの場合は結果の再閲覧のために保有し、それ以外の場合は遅滞なく破棄します。ただし、以下の場合は明示した期間保有します。',
          zh: '公司就付費服務所蒐集之使用者個人資料，為提供結果回看而保存；其餘情形則不延遲予以銷毀。但於下列情形，保存所列明之期間。',
        } },
        { t: 'p', v: {
          ko: '상법 등 법령의 규정에 의하여 보존할 필요성이 있는 경우에는 이용자의 개인정보를 보유할 수 있습니다.',
          en: 'Where retention is necessary under the provisions of laws such as the Commercial Act, the Company may retain users’ personal information.',
          ja: '商法などの法令の規定により保存の必要がある場合には、利用者の個人情報を保有することがあります。',
          zh: '依《商法》等法令規定有保存必要時，得保存使用者之個人資料。',
        } },
        { t: 'olist', items: [
          { v: {
            ko: '표시∙광고에 관한 기록: 6개월 (전자상거래 등에서의 소비자보호에 관한 법률)',
            en: 'Records on display/advertising: 6 months (Act on Consumer Protection in Electronic Commerce, etc.)',
            ja: '表示・広告に関する記録: 6か月（電子商取引等における消費者保護に関する法律）',
            zh: '標示∙廣告相關紀錄：6個月（《電子商務等消費者保護法》）',
          } },
          { v: {
            ko: '계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            en: 'Records on contracts or withdrawal of offers, etc.: 5 years (Act on Consumer Protection in Electronic Commerce, etc.)',
            ja: '契約または申込撤回等に関する記録: 5年（電子商取引等における消費者保護に関する法律）',
            zh: '契約或撤回要約等相關紀錄：5年（《電子商務等消費者保護法》）',
          } },
          { v: {
            ko: '대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            en: 'Records on payment and supply of goods, etc.: 5 years (Act on Consumer Protection in Electronic Commerce, etc.)',
            ja: '代金決済および財貨等の供給に関する記録: 5年（電子商取引等における消費者保護に関する法律）',
            zh: '貨款支付及財貨等供應相關紀錄：5年（《電子商務等消費者保護法》）',
          } },
        ] },
      ],
    },
    {
      id: 'p-3',
      title: { ko: '3. 개인정보의 제3자 제공', en: '3. Provision of Personal Information to Third Parties', ja: '3. 個人情報の第三者提供', zh: '3. 個人資料之第三方提供' },
      blocks: [
        { t: 'p', v: {
          ko: '회사는 이용자 동의나 관계법령의 근거 없이 개인정보를 타인 또는 타기업∙기관에 제공하지 않습니다.',
          en: 'The Company does not provide personal information to others or to other companies/organizations without the user’s consent or a basis in relevant laws.',
          ja: '会社は、利用者の同意または関係法令の根拠なく、個人情報を他人または他の企業・機関に提供しません。',
          zh: '公司未經使用者同意或無相關法令依據，不將個人資料提供予他人或其他企業∙機構。',
        } },
        { t: 'p', v: {
          ko: '1) 이용자 동의에 따른 제공',
          en: '1) Provision based on user consent',
          ja: '1) 利用者の同意による提供',
          zh: '1) 依使用者同意之提供',
        } },
        { t: 'p', v: {
          ko: '회사는 제휴사와 협력하여 서비스를 제공하거나 이벤트 진행을 위해 개인정보 공유가 필요할 경우, 정보주체에게 개인정보의 공동수집 또는 공유 사실을 사전 공지하고 동의를 받습니다.',
          en: 'Where sharing personal information is necessary to provide services in cooperation with partners or to run events, the Company gives prior notice to the data subject of the joint collection or sharing and obtains consent.',
          ja: '会社は、提携先と協力してサービスを提供し、またはイベント実施のために個人情報の共有が必要な場合、情報主体に個人情報の共同収集または共有の事実を事前に告知し、同意を得ます。',
          zh: '公司於與合作夥伴協力提供服務或舉辦活動而需共享個人資料時，事先告知資料當事人共同蒐集或共享之事實並取得同意。',
        } },
        { t: 'p', v: {
          ko: '회사는 이용자에게 보다 나은 서비스 제공을 위하여 해당 유료 서비스 이용자에 한해 별도 동의를 받고 콘텐츠 제공업체와 제휴를 하고 있으며, 제3의 업체에게 최소한의 개인정보를 안전한 방법으로 전달, 관리하고 있습니다.',
          en: 'To provide better services, the Company partners with content providers only with the separate consent of the relevant paid-service user, and transmits and manages the minimum necessary personal information to third-party providers in a secure manner.',
          ja: '会社は、より良いサービス提供のため、当該有料サービス利用者に限り別途同意を得てコンテンツ提供業者と提携しており、第三の業者に最小限の個人情報を安全な方法で伝達・管理しています。',
          zh: '公司為提供更佳服務，僅就該付費服務使用者另行取得同意後與內容提供商合作，並以安全方式向第三方業者傳遞與管理最小限度之個人資料。',
        } },
        { t: 'p', v: {
          ko: '2) 이용자 동의 없이 개인정보를 제공하는 경우',
          en: '2) Cases where personal information is provided without user consent',
          ja: '2) 利用者の同意なく個人情報を提供する場合',
          zh: '2) 未經使用者同意而提供個人資料之情形',
        } },
        { t: 'olist', items: [
          { v: {
            ko: '서비스 제공에 따른 요금 정산을 위하여 필요한 경우',
            en: 'Where necessary for settlement of fees arising from service provision',
            ja: 'サービス提供に伴う料金精算のために必要な場合',
            zh: '為服務提供所生費用結算所需之情形',
          } },
          { v: {
            ko: '행정 목적이나 수사목적으로 행정관청 또는 수사기관으로부터 법률에 규정된 바에 따라 영장이나 그에 준하는 공문을 전달받은 경우',
            en: 'Where, for administrative or investigative purposes, a warrant or equivalent official document is received from an administrative or investigative agency as prescribed by law',
            ja: '行政目的または捜査目的で、行政官庁または捜査機関から法律に規定された通り令状またはそれに準ずる公文書を受け取った場合',
            zh: '基於行政目的或偵查目的，依法律規定自行政機關或偵查機關收受令狀或相當公文之情形',
          } },
          { v: {
            ko: '이용자의 생명이나 안전에 급박한 위험이 확인된 경우',
            en: 'Where an imminent danger to the user’s life or safety is confirmed',
            ja: '利用者の生命または安全に切迫した危険が確認された場合',
            zh: '經確認對使用者生命或安全有急迫危險之情形',
          } },
        ] },
        { t: 'p', v: {
          ko: '사이트에 게재된 광고나 단순 링크되어 있는 웹사이트에서 귀하의 개인정보를 수집할 수 있으니 유념하시기 바랍니다. 이러한 경우에는 본 "개인정보처리방침"이 적용되지 않습니다.',
          en: 'Please note that advertisements posted on the site or websites that are merely linked may collect your personal information. In such cases, this Privacy Policy does not apply.',
          ja: 'サイトに掲載された広告や単にリンクされているウェブサイトでお客様の個人情報を収集することがありますのでご留意ください。このような場合には、本「プライバシーポリシー」は適用されません。',
          zh: '請注意，網站上刊登之廣告或僅以連結方式呈現之網站可能蒐集您的個人資料。於此等情形，本「隱私權政策」不適用。',
        } },
      ],
    },
    {
      id: 'p-4',
      title: { ko: '4. 개인정보의 위탁', en: '4. Outsourcing of Personal Information', ja: '4. 個人情報の委託', zh: '4. 個人資料之委託' },
      blocks: [
        { t: 'p', v: {
          ko: '회사는 전문적인 운세 서비스를 위하여 개인정보를 수집하여 외부 전문업체에 위탁하여 운영하고 있습니다.',
          en: 'For professional fortune services, the Company collects personal information and entrusts its processing to external specialized providers.',
          ja: '会社は、専門的な運勢サービスのために個人情報を収集し、外部の専門業者に委託して運営しています。',
          zh: '公司為提供專業運勢服務，蒐集個人資料並委託外部專業業者處理營運。',
        } },
        { t: 'table',
          head: [
            { ko: '구분', en: 'Category', ja: '区分', zh: '區分' },
            { ko: '수탁자', en: 'Trustee', ja: '受託者', zh: '受託者' },
            { ko: '위탁업무', en: 'Entrusted Task', ja: '委託業務', zh: '委託業務' },
          ],
          rows: [
            [
              { ko: '결제', en: 'Payment', ja: '決済', zh: '付款' },
              { ko: '토스페이먼츠 (1544-7772)', en: 'Toss Payments (1544-7772)', ja: 'Toss Payments（1544-7772）', zh: 'Toss Payments（1544-7772）' },
              { ko: '유료 콘텐츠 사용을 위한 결제 대행', en: 'Payment agency for use of paid content', ja: '有料コンテンツ利用のための決済代行', zh: '付費內容使用之代收付' },
            ],
          ],
        },
        { t: 'p', v: {
          ko: '회사는 위탁계약서 등을 통하여 개인정보보호법 제26조에 따라 위탁업무 수행 목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 사고 시 손해배상, 위탁기간, 개인정보에 관한 비밀유지, 제3자 제공에 대한 금지 등에 관한 사항을 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.',
          en: 'Pursuant to Article 26 of the Personal Information Protection Act, the Company specifies—through outsourcing agreements and the like—matters such as the prohibition of processing personal information beyond the purpose of the entrusted task, technical and administrative protective measures, restrictions on re-entrustment, compensation for damages in case of incidents, the entrustment period, confidentiality of personal information, and the prohibition of provision to third parties, and supervises whether the trustee processes personal information safely.',
          ja: '会社は、委託契約書等を通じて個人情報保護法第26条に基づき、委託業務遂行目的外の個人情報処理禁止、技術的・管理的保護措置、再委託の制限、事故時の損害賠償、委託期間、個人情報に関する秘密保持、第三者提供の禁止などに関する事項を明示し、受託者が個人情報を安全に処理しているかを監督しています。',
          zh: '公司透過委託契約等，依《個人資料保護法》第26條明定委託業務執行目的外禁止處理個人資料、技術性與管理性保護措施、再委託限制、事故時損害賠償、委託期間、個人資料保密、禁止第三方提供等事項，並監督受託者是否安全處理個人資料。',
        } },
        { t: 'p', v: {
          ko: '또한 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체없이 본 개인정보 처리방침을 통하여 공개하도록 하겠습니다.',
          en: 'In addition, if the content of the entrusted task or the trustee changes, the Company will disclose this through this Privacy Policy without delay.',
          ja: 'また、委託業務の内容や受託者が変更される場合には、遅滞なく本プライバシーポリシーを通じて公開します。',
          zh: '此外，委託業務內容或受託者變更時，公司將不延遲透過本隱私權政策予以公開。',
        } },
      ],
    },
    {
      id: 'p-5',
      title: { ko: '5. 정보주체(고객)의 권리, 의무 및 행사방법', en: '5. Rights and Obligations of the Data Subject (Customer) and How to Exercise Them', ja: '5. 情報主体（顧客）の権利、義務および行使方法', zh: '5. 資料當事人（顧客）之權利、義務及行使方法' },
      blocks: [
        { t: 'p', v: {
          ko: '정보주체는 회사에 대해 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다. 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.',
          en: 'The data subject may exercise the following rights relating to the protection of personal information against the Company at any time. Rights may be exercised in writing, by phone, by email, by fax, and the like, and the Company will take action without delay.',
          ja: '情報主体は、会社に対していつでも次の個人情報保護に関する権利を行使できます。権利行使は、会社に対し書面、電話、電子メール、ファクシミリ（FAX）などを通じて行うことができ、会社はこれに対し遅滞なく措置します。',
          zh: '資料當事人得隨時對公司行使下列個人資料保護相關權利。權利行使得以書面、電話、電子郵件、傳真（FAX）等方式為之，公司將不延遲予以處理。',
        } },
        { t: 'olist', items: [
          { v: { ko: '개인정보 열람요구', en: 'Request to access personal information', ja: '個人情報の閲覧要求', zh: '查閱個人資料之要求' } },
          { v: { ko: '오류 등이 있을 경우 정정 요구', en: 'Request to correct errors, etc.', ja: '誤り等がある場合の訂正要求', zh: '有錯誤等情形時之更正要求' } },
          { v: { ko: '삭제 요구', en: 'Request for deletion', ja: '削除要求', zh: '刪除要求' } },
          { v: { ko: '처리정지 요구', en: 'Request to suspend processing', ja: '処理停止要求', zh: '停止處理要求' } },
        ] },
        { t: 'p', v: {
          ko: '정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.',
          en: 'Where the data subject requests correction or deletion regarding errors in personal information, the Company will not use or provide the relevant personal information until the correction or deletion is completed.',
          ja: '情報主体が個人情報の誤り等に対する訂正または削除を要求した場合、会社は訂正または削除が完了するまで当該個人情報を利用または提供しません。',
          zh: '資料當事人就個人資料之錯誤等要求更正或刪除時，公司於完成更正或刪除前，不利用或提供該個人資料。',
        } },
        { t: 'p', v: {
          ko: '권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.',
          en: 'Rights may be exercised through an agent such as the data subject’s statutory representative or a duly authorized person. In this case, a power of attorney in the form of Attached Form No. 11 of the Enforcement Rules of the Personal Information Protection Act must be submitted.',
          ja: '権利行使は、情報主体の法定代理人または委任を受けた者などの代理人を通じて行うことができます。この場合、個人情報保護法施行規則別紙第11号書式による委任状を提出する必要があります。',
          zh: '權利得透過資料當事人之法定代理人或受委任人等代理人行使。於此情形，須提交依《個人資料保護法施行規則》附表第11號格式之委任書。',
        } },
        { t: 'p', v: {
          ko: '정보주체는 개인정보 보호법 등 관계법령을 위반하여 회사가 처리하고 있는 정보주체 본인이나 타인의 개인정보 및 사생활을 침해하여서는 아니 됩니다.',
          en: 'The data subject must not infringe, in violation of the Personal Information Protection Act and other relevant laws, the personal information or privacy of themselves or others that the Company is processing.',
          ja: '情報主体は、個人情報保護法など関係法令に違反して、会社が処理している情報主体本人または他人の個人情報およびプライバシーを侵害してはなりません。',
          zh: '資料當事人不得違反《個人資料保護法》等相關法令，侵害公司所處理之當事人本人或他人之個人資料及隱私。',
        } },
      ],
    },
    {
      id: 'p-6',
      title: { ko: '6. 개인정보 파기절차 및 방법', en: '6. Procedures and Methods for Destroying Personal Information', ja: '6. 個人情報の破棄手続きおよび方法', zh: '6. 個人資料之銷毀程序及方法' },
      blocks: [
        { t: 'p', v: {
          ko: '정보주체의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 회사의 개인정보 파기절차 및 방법은 다음과 같습니다.',
          en: 'In principle, the data subject’s personal information is destroyed without delay once the purpose of its collection and use is achieved. The Company’s destruction procedures and methods are as follows.',
          ja: '情報主体の個人情報は、原則として収集および利用目的が達成されると遅滞なく破棄します。会社の個人情報破棄手続きおよび方法は次のとおりです。',
          zh: '資料當事人之個人資料原則上於蒐集及利用目的達成後不延遲予以銷毀。公司之個人資料銷毀程序及方法如下。',
        } },
        { t: 'p', v: {
          ko: '1) 파기절차',
          en: '1) Destruction procedure',
          ja: '1) 破棄手続き',
          zh: '1) 銷毀程序',
        } },
        { t: 'p', v: {
          ko: '정보주체가 서비스 이용 등을 위해 입력한 정보는 목적이 달성된 후 무료서비스의 경우 즉시 파기하며, 유료서비스의 경우 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 다시보기 기간 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다. 동 개인정보는 법률에 의한 경우가 아니고서는 보유되는 이외의 다른 목적으로 이용되지 않습니다.',
          en: 'Information entered by the data subject to use the Service is, after the purpose is achieved, immediately destroyed in the case of free services; in the case of paid services, it is moved to a separate database (a separate filing cabinet in the case of paper) and stored for a certain period according to the replay period and other information-protection grounds under relevant laws, then destroyed. Such personal information is not used for any purpose other than retention, except as required by law.',
          ja: '情報主体がサービス利用等のために入力した情報は、目的達成後、無料サービスの場合は直ちに破棄し、有料サービスの場合は別途のDBに移され（紙の場合は別途の書類箱）、再閲覧期間およびその他関係法令による情報保護事由に従い一定期間保存された後に破棄されます。当該個人情報は、法律による場合を除き、保有される以外の他の目的では利用されません。',
          zh: '資料當事人為使用服務等所輸入之資訊，於目的達成後，免費服務即時銷毀；付費服務則移至獨立資料庫（紙本者移至獨立文件櫃），依回看期間及其他相關法令之資料保護事由保存一定期間後銷毀。該個人資料除依法律者外，不用於保存以外之其他目的。',
        } },
        { t: 'p', v: {
          ko: '2) 파기방법',
          en: '2) Destruction method',
          ja: '2) 破棄方法',
          zh: '2) 銷毀方法',
        } },
        { t: 'list', items: [
          { v: {
            ko: '종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.',
            en: 'Personal information printed on paper is destroyed by shredding or incineration.',
            ja: '紙に出力された個人情報は、シュレッダーで粉砕するか焼却して破棄します。',
            zh: '印於紙本之個人資料以碎紙機粉碎或焚燒方式銷毀。',
          } },
          { v: {
            ko: '전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.',
            en: 'Personal information stored in electronic file form is deleted using technical methods that prevent the records from being reproduced.',
            ja: '電子ファイル形式で保存された個人情報は、記録を再生できない技術的方法を用いて削除します。',
            zh: '以電子檔案形式儲存之個人資料，使用無法重現紀錄之技術方法予以刪除。',
          } },
        ] },
      ],
    },
    {
      id: 'p-7',
      title: { ko: '7. 개인정보의 안전성 확보 조치에 관한 사항', en: '7. Measures to Ensure the Security of Personal Information', ja: '7. 個人情報の安全性確保措置に関する事項', zh: '7. 確保個人資料安全性之措施事項' },
      blocks: [
        { t: 'p', v: {
          ko: '1) 비밀번호 암호화',
          en: '1) Password encryption',
          ja: '1) パスワードの暗号化',
          zh: '1) 密碼加密',
        } },
        { t: 'p', v: {
          ko: '이용자의 개인정보는 비밀번호에 의해 보호되고 있습니다.',
          en: 'Users’ personal information is protected by passwords.',
          ja: '利用者の個人情報はパスワードによって保護されています。',
          zh: '使用者之個人資料受密碼保護。',
        } },
        { t: 'p', v: {
          ko: '2) 개인 아이디와 비밀번호 관리',
          en: '2) Management of personal ID and password',
          ja: '2) 個人IDおよびパスワードの管理',
          zh: '2) 個人帳號與密碼管理',
        } },
        { t: 'p', v: {
          ko: '이용자 계정의 비밀번호는 오직 본인만이 알 수 있으며, 이용자의 비밀번호는 누구에게도 알려주면 안 됩니다. 또한 작업을 마치신 후에는 웹브라우저를 종료하는 것이 바람직합니다. 특히 다른 사람과 컴퓨터를 공유하여 사용하거나 공공장소에서 이용한 경우 개인정보가 다른 사람에게 알려지는 것을 막기 위해서 이와 같은 절차가 더욱 필요하다고 하겠습니다.',
          en: 'The password of a user’s account can be known only by the user, and the password must not be disclosed to anyone. It is also advisable to close the web browser after finishing your work. In particular, when sharing a computer with others or using it in a public place, such steps are all the more necessary to prevent personal information from being disclosed to others.',
          ja: '利用者アカウントのパスワードは本人のみが知ることができ、利用者のパスワードを誰にも知らせてはいけません。また、作業を終えた後はウェブブラウザを終了することが望ましいです。特に他人とコンピュータを共有して使用したり、公共の場所で利用した場合、個人情報が他人に知られることを防ぐため、このような手順がより一層必要です。',
          zh: '使用者帳號之密碼僅本人得知，且不得告知任何人。完成作業後並宜關閉網頁瀏覽器。尤其與他人共用電腦或於公共場所使用時，為防止個人資料為他人所知，更需採行上述步驟。',
        } },
        { t: 'p', v: {
          ko: '회사는 이용자 개인의 부주의로 휴대폰번호, 비밀번호 등의 개인정보가 유출되어 발생한 문제와 기본적인 인터넷의 위험성 때문에 일어나는 일에 대해 책임을 지지 않습니다.',
          en: 'The Company is not responsible for problems arising from the leakage of personal information such as mobile numbers and passwords due to a user’s own carelessness, or for matters caused by the inherent risks of the internet.',
          ja: '会社は、利用者個人の不注意により携帯電話番号、パスワードなどの個人情報が流出して発生した問題、および基本的なインターネットの危険性により生じる事柄について責任を負いません。',
          zh: '對於因使用者個人疏忽致行動電話號碼、密碼等個人資料外洩所生問題，及因網際網路固有風險所致事項，公司不負責任。',
        } },
      ],
    },
    {
      id: 'p-8',
      title: { ko: '8. 개인정보 관리책임자', en: '8. Personal Information Protection Officer', ja: '8. 個人情報管理責任者', zh: '8. 個人資料管理責任人' },
      blocks: [
        { t: 'p', v: {
          ko: '타오운세를 이용하면서 발생하는 모든 개인정보보호 관련 문의, 불만, 조언이나 기타사항은 아래 개인정보관리책임자에게 연락해 주시기 바랍니다.',
          en: 'For any inquiries, complaints, advice, or other matters relating to personal information protection arising while using Taoist Fortune, please contact the Personal Information Protection Officer below.',
          ja: 'タオ運勢をご利用になる中で発生するすべての個人情報保護に関するお問い合わせ、苦情、助言その他の事項は、下記の個人情報管理責任者までご連絡ください。',
          zh: '使用타오運勢期間所生之一切個人資料保護相關詢問、申訴、建議或其他事項，請聯絡下列個人資料管理責任人。',
        } },
        { t: 'kv', rows: [
          { k: { ko: '이름', en: 'Name', ja: '氏名', zh: '姓名' }, v: '정송엽' },
          { k: { ko: '직위', en: 'Position', ja: '役職', zh: '職位' }, v: { ko: '대표이사', en: 'CEO', ja: '代表取締役', zh: '代表理事' } },
          { k: { ko: '연락처', en: 'Contact', ja: '連絡先', zh: '聯絡電話' }, v: '010-9045-9579' },
          { k: { ko: '이메일', en: 'Email', ja: 'メール', zh: '電子郵件' }, v: 'admin@taoist.co.kr' },
        ] },
      ],
    },
    {
      id: 'p-9',
      title: { ko: '9. 개인정보 처리방침 변경에 관한 사항', en: '9. Changes to the Privacy Policy', ja: '9. プライバシーポリシーの変更に関する事項', zh: '9. 隱私權政策變更事項' },
      blocks: [
        { t: 'p', v: {
          ko: '현 개인정보처리방침 내용의 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일 전부터 홈페이지의 "공지사항"을 통해 고지할 것입니다.',
          en: 'When there are additions, deletions, or amendments to this Privacy Policy, we will give notice through the "Notices" section of the website at least 7 days before the revision.',
          ja: '現プライバシーポリシーの内容に追加、削除および修正がある場合には、改定の最低7日前からホームページの「お知らせ」を通じて告知します。',
          zh: '本隱私權政策內容如有新增、刪除及修改時，將自修訂至少7日前起透過網站「公告」予以告知。',
        } },
      ],
    },
  ],

  dates: {
    noticeLabel:    { ko: '공고일자', en: 'Date Announced', ja: '公告日', zh: '公告日期' },
    noticeDate:     { ko: '2025년 6월 1일', en: 'June 1, 2025', ja: '2025年6月1日', zh: '2025年6月1日' },
    effectiveLabel: { ko: '시행일자', en: 'Effective Date', ja: '施行日', zh: '施行日期' },
    effectiveDate:  { ko: '2025년 6월 8일', en: 'June 8, 2025', ja: '2025年6月8日', zh: '2025年6月8日' },
  },
};
